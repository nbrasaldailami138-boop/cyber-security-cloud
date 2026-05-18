import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { encryptMessage } from "@/lib/crypto";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { messageRateLimiter } from "@/lib/ratelimit";
import { triggerNewMessage, triggerNotification } from "@/lib/pusherService";
import { sendPushNotification } from "@/lib/pushNotifications";
import { z } from "zod";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
const window = new JSDOM("").window;
const purify = DOMPurify(window as any);
const messageSchema = z.object({
  receiverId: z.string().min(1, "المستقبل مطلوب"),
  body: z.string().min(1, "الرسالة فارغة").max(2000, "الرسالة طويلة جداً"),
  replyToId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 },
      );
    }

    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET);
    const senderId = payload.sub as string;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // Rate Limiting
    const { success: rateLimitOk } = await messageRateLimiter.limit(ip);
    if (!rateLimitOk) {
      return NextResponse.json(
        { success: false, message: "رسائل كثيرة. انتظر قليلاً." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const validation = messageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    let { receiverId, body: messageBody, replyToId } = validation.data;

    // تعقيم الرسالة من XSS
    messageBody = purify.sanitize(messageBody, { ALLOWED_TAGS: [] });

    // التحقق من صلاحية المراسلة (العزل الأكاديمي)
    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!sender || !receiver) {
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    // التحقق من الحظر
    const isBlocked = await prisma.message.findFirst({
      where: {
        OR: [
          { senderId: receiverId, receiverId: senderId, isBlocked: true },
          { senderId: senderId, receiverId: receiverId, isBlocked: true },
        ],
      },
    });
    if (isBlocked) {
      return NextResponse.json(
        { success: false, message: "لا يمكنك مراسلة هذا المستخدم" },
        { status: 403 },
      );
    }

    // العزل الأكاديمي
    if (sender.role === "STUDENT") {
      if (receiver.role === "STUDENT") {
        return NextResponse.json(
          { success: false, message: "لا يمكنك مراسلة طالب آخر" },
          { status: 403 },
        );
      }
      if (receiver.role === "TEACHER" || receiver.role === "MANAGEMENT") {
        if (receiver.level !== sender.level) {
          return NextResponse.json(
            { success: false, message: "لا يمكنك مراسلة معلمين من مستوى آخر" },
            { status: 403 },
          );
        }
      }
    }

    if (sender.role === "TEACHER" && receiver.role === "TEACHER") {
      return NextResponse.json(
        { success: false, message: "لا يمكنك مراسلة معلم آخر" },
        { status: 403 },
      );
    }

    // تشفير الرسالة
    const encryptedBody = encryptMessage(messageBody);

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        body: encryptedBody,
        encrypted: true,
        ...(replyToId ? { replyToId } : {}),
      },
    });

    // تحديث آخر ظهور للمرسل (غير متزامن)
    prisma.user
      .update({
        where: { id: senderId },
        data: { lastSeenAt: new Date() },
      })
      .catch(() => {});

    // التحقق من حالة المستخدم: هل هو في نفس المحادثة؟
    let isInChatWithSender = false;
    try {
      const userStatus = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { lastSeenAt: true },
      });
      // إذا كان آخر ظهور للمستخدم خلال آخر دقيقتين، نعتبره داخل المحادثة
      if (
        userStatus?.lastSeenAt &&
        Date.now() - new Date(userStatus.lastSeenAt).getTime() < 2 * 60 * 1000
      ) {
        isInChatWithSender = true;
      }
    } catch {}

    // إنشاء إشعار (غير متزامن - لا ننتظره)
    prisma.notification
      .create({
        data: {
          userId: receiverId,
          type: "NEW_MESSAGE",
          title: "رسالة جديدة",
          body: `رسالة جديدة من ${sender.name}`,
          linkUrl: "/chat",
        },
      })
      .catch(() => {});

    // إرسال إشعار فوري عبر Pusher (غير متزامن) - هذا ضروري لتحديث الواجهة
    triggerNewMessage(senderId, receiverId, {
      id: message.id,
      body: messageBody,
      createdAt: message.createdAt.toISOString(),
      sender: { id: senderId, name: sender.name },
    }).catch(() => {});

    // إرسال الإشعارات المنبثقة والخارجية فقط إذا لم يكن المستقبل داخل المحادثة
    if (!isInChatWithSender) {
      triggerNotification(receiverId, {
        id: message.id,
        type: "NEW_MESSAGE",
        title: "رسالة جديدة",
        body: `رسالة جديدة من ${sender.name}`,
        linkUrl: "/chat",
      }).catch(() => {});

      sendPushNotification(
        receiverId,
        "💬 رسالة جديدة",
        `رسالة جديدة من ${sender.name}`,
        "/chat",
      ).catch(() => {});

      import("@/lib/pushNotifications")
        .then(({ sendPushToUsers }) => {
          sendPushToUsers([receiverId], {
            title: "💬 رسالة جديدة",
            body: `رسالة جديدة من ${sender.name}`,
            data: { url: "/chat" },
            sound: "/sounds/notification.mp3",
          }).catch(() => {});
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "تم إرسال الرسالة",
      data: message,
    });
  } catch (error: any) {
    console.error("Send Message Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

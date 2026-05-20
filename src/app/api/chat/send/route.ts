import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { encryptMessage } from "@/lib/crypto";
import { messageRateLimiter } from "@/lib/ratelimit";
import { broadcastEvent } from "@/lib/supabaseRealtime";
import { z } from "zod";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

// تهيئة JSDOM + DOMPurify مرة واحدة فقط (Lazy Initialization)
let purifyInstance: any = null;
async function getPurify() {
  if (!purifyInstance) {
    const { JSDOM } = await import("jsdom");
    const DOMPurify = (await import("dompurify")).default;
    purifyInstance = DOMPurify(new JSDOM("").window as any);
  }
  return purifyInstance;
}

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

    // Rate Limiting (ربط بـ IP + senderId لمنع التجاوز)
    const { success: rateLimitOk } = await messageRateLimiter.limit(
      `${ip}_${senderId}`,
    );
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

    const { receiverId, body: rawMessageBody, replyToId } = validation.data;

    // تعقيم الرسالة من XSS
    const messageBody = (await getPurify()).sanitize(rawMessageBody, { ALLOWED_TAGS: [] });

    // التحقق من صلاحية المراسلة (العزل الأكاديمي) - استعلام واحد متوازي
    const [sender, receiver] = await Promise.all([
      prisma.user.findUnique({ where: { id: senderId } }),
      prisma.user.findUnique({ where: { id: receiverId } }),
    ]);

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
    const isAdmin = sender.role === "ADMIN";
    if (isAdmin) {
      // ADMIN يستطيع مراسلة الجميع
    } else if (sender.role === "MANAGEMENT") {
      // الإدارة: ترسل لنفس مستواها فقط
      if (receiver.role === "TEACHER" || receiver.role === "STUDENT") {
        if (receiver.level !== sender.level) {
          return NextResponse.json(
            { success: false, message: "لا يمكنك مراسلة مستخدمين من مستوى آخر" },
            { status: 403 },
          );
        }
      }
    } else if (sender.role === "TEACHER") {
      // المعلم: يرسل لنفس مستواه فقط
      if (receiver.role === "TEACHER") {
        return NextResponse.json(
          { success: false, message: "لا يمكنك مراسلة معلم آخر" },
          { status: 403 },
        );
      }
      if (receiver.role === "STUDENT" || receiver.role === "MANAGEMENT") {
        if (receiver.level !== sender.level) {
          return NextResponse.json(
            { success: false, message: "لا يمكنك مراسلة مستخدمين من مستوى آخر" },
            { status: 403 },
          );
        }
      }
    } else if (sender.role === "STUDENT") {
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

    // التحقق من حالة المستخدم عبر Presence (WebSocket)
    let isInChatWithSender = false;
    try {
      const { isUserOnline } = await import("@/lib/supabaseRealtime");
      isInChatWithSender = isUserOnline(receiverId);
    } catch {}

    // إنشاء إشعار داخلي (غير متزامن)
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

    // إرسال الأحداث اللحظية عبر Supabase Broadcast (Fire and Forget)
    broadcastEvent(`user-${receiverId}`, "new-message", {
      id: message.id,
      senderId,
      receiverId,
      body: messageBody,
      createdAt: message.createdAt.toISOString(),
      sender: { id: senderId, name: sender.name },
    });

    broadcastEvent(`user-${senderId}`, "new-message", {
      id: message.id,
      senderId,
      receiverId,
      body: messageBody,
      createdAt: message.createdAt.toISOString(),
      sender: { id: senderId, name: sender.name },
    });

    // إرسال الإشعارات المنبثقة والخارجية فقط إذا لم يكن المستقبل داخل المحادثة
    if (!isInChatWithSender) {
      broadcastEvent(`user-${receiverId}`, "notification", {
        id: message.id,
        type: "NEW_MESSAGE",
        title: "رسالة جديدة",
        body: `رسالة جديدة من ${sender.name}`,
        linkUrl: "/chat",
      });

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

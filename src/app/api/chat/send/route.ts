import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { messageRateLimiter } from "@/lib/ratelimit";
import { z } from "zod";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

const messageSchema = z.object({
  receiverId: z.string().min(1, "المستقبل مطلوب"),
  body: z.string().min(1, "الرسالة فارغة").max(2000, "الرسالة طويلة جداً"),
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

    const { receiverId, body: messageBody } = validation.data;

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

    // العزل الأكاديمي
    if (sender.role === "STUDENT" && receiver.role === "STUDENT") {
      return NextResponse.json(
        { success: false, message: "لا يمكنك مراسلة طالب آخر" },
        { status: 403 },
      );
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        body: messageBody,
      },
    });

    // إنشاء إشعار
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: "NEW_MESSAGE",
        title: "رسالة جديدة",
        body: `رسالة جديدة من ${sender.name}`,
        linkUrl: "/chat",
      },
    });

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

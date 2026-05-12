import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export async function GET(request: NextRequest) {
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
    const userId = payload.sub as string;

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get("userId");

    if (!otherUserId) {
      // جلب قائمة المحادثات
      const messages = await prisma.message.findMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
          ...(payload.role === "STUDENT" ? {} : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          sender: { select: { id: true, name: true, role: true } },
          receiver: { select: { id: true, name: true, role: true } },
        },
      });

      // تجميع المحادثات حسب المستخدم الآخر
      const conversations: any[] = [];
      const seen = new Set<string>();

      for (const msg of messages) {
        const other = msg.senderId === userId ? msg.receiver : msg.sender;
        const key = other.id;
        if (!seen.has(key)) {
          seen.add(key);
          conversations.push({
            userId: other.id,
            name: other.name,
            role: other.role,
            lastMessage: msg.body.slice(0, 50),
            createdAt: msg.createdAt,
            isRead: msg.isRead,
            isSent: msg.senderId === userId,
          });
        }
      }

      return NextResponse.json({ success: true, data: conversations });
    } else {
      // جلب رسائل محادثة محددة
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        include: {
          sender: { select: { id: true, name: true } },
        },
      });

      // تحديث الرسائل كمقروءة
      await prisma.message.updateMany({
        where: { receiverId: userId, senderId: otherUserId, isRead: false },
        data: { isRead: true },
      });

      return NextResponse.json({ success: true, data: messages });
    }
  } catch (error: any) {
    console.error("Get Messages Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

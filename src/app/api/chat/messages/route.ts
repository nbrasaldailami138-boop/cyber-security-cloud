import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { decryptMessage, encryptMessage } from "@/lib/crypto";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
const window = new JSDOM("").window;
const purify = DOMPurify(window as any);

export const dynamic = "force-dynamic";

// ==================== GET ====================
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
    const userRole = payload.role as string;
    const userLevel = payload.level as string;

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get("userId");

    if (!otherUserId) {
      // جلب قائمة المحادثات
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, senderDeleted: false },
            { receiverId: userId, receiverDeleted: false },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          sender: { select: { id: true, name: true, role: true, level: true } },
          receiver: {
            select: { id: true, name: true, role: true, level: true },
          },
        },
      });

      const conversations: any[] = [];
      const seen = new Set<string>();

      for (const msg of messages) {
        const other = msg.senderId === userId ? msg.receiver : msg.sender;
        const key = other.id;
        if (!seen.has(key)) {
          seen.add(key);
          const body = msg.encrypted ? decryptMessage(msg.body) : msg.body;
          conversations.push({
            userId: other.id,
            name: other.name,
            role: other.role,
            level: other.level,
            lastMessage: body.slice(0, 50),
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
            { senderId: userId, receiverId: otherUserId, senderDeleted: false },
            {
              senderId: otherUserId,
              receiverId: userId,
              receiverDeleted: false,
            },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        include: {
          sender: { select: { id: true, name: true } },
        },
      });

      // فك تشفير الرسائل
      const decrypted = messages.map((msg) => ({
        ...msg,
        body: msg.encrypted ? decryptMessage(msg.body) : msg.body,
      }));

      // تحديث الرسائل كمقروءة
      await prisma.message.updateMany({
        where: { receiverId: userId, senderId: otherUserId, isRead: false },
        data: { isRead: true },
      });

      return NextResponse.json({ success: true, data: decrypted });
    }
  } catch (error: any) {
    console.error("Get Messages Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

// ==================== PATCH: تعديل رسالة ====================
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { messageId, newBody } = body;

    if (!messageId || !newBody || !newBody.trim()) {
      return NextResponse.json(
        { success: false, message: "البيانات مطلوبة" },
        { status: 400 },
      );
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.senderId !== userId) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );
    }

    const sanitized = purify.sanitize(newBody.trim(), { ALLOWED_TAGS: [] });
    const encryptedBody = encryptMessage(sanitized);

    await prisma.message.update({
      where: { id: messageId },
      data: { body: encryptedBody, isEdited: true },
    });

    return NextResponse.json({ success: true, message: "تم تعديل الرسالة" });
  } catch {
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

// ==================== DELETE: حذف رسالة أو محادثة كاملة أو حظر ====================
export async function DELETE(request: NextRequest) {
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

    const body = await request.json();
    const { messageId, otherUserId, action } = body;

    if (messageId && !otherUserId) {
      // حذف رسالة واحدة
      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });
      if (!message) {
        return NextResponse.json(
          { success: false, message: "الرسالة غير موجودة" },
          { status: 404 },
        );
      }

      if (message.senderId === userId) {
        await prisma.message.update({
          where: { id: messageId },
          data: { senderDeleted: true },
        });
      } else if (message.receiverId === userId) {
        await prisma.message.update({
          where: { id: messageId },
          data: { receiverDeleted: true },
        });
      } else {
        return NextResponse.json(
          { success: false, message: "غير مصرح" },
          { status: 403 },
        );
      }

      return NextResponse.json({ success: true, message: "تم حذف الرسالة" });
    }

    if (otherUserId && action === "delete-conversation") {
      // حذف المحادثة كاملة
      await prisma.message.updateMany({
        where: { senderId: userId, receiverId: otherUserId },
        data: { senderDeleted: true },
      });
      await prisma.message.updateMany({
        where: { receiverId: userId, senderId: otherUserId },
        data: { receiverDeleted: true },
      });

      return NextResponse.json({ success: true, message: "تم حذف المحادثة" });
    }

    if (otherUserId && action === "block") {
      // حظر المستخدم
      await prisma.message.updateMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        data: { isBlocked: true },
      });

      return NextResponse.json({ success: true, message: "تم حظر المستخدم" });
    }

    return NextResponse.json(
      { success: false, message: "إجراء غير معروف" },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";
import { broadcastEvent } from "@/lib/supabaseRealtime";
import { sendPushToUsers } from "@/lib/pushNotifications";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 },
      );
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 },
      );
    }

    const {
      fileUrl,
      fileName,
      language,
      showAuthor,
      level,
      title,
      authorName,
      note,
    } = await request.json();

    if (!fileUrl || !fileName) {
      return NextResponse.json(
        { success: false, error: "البيانات غير مكتملة" },
        { status: 400 },
      );
    }

    // حفظ في SystemConfig كسجل للملفات المشتركة
    const shareId = `shared_${Date.now()}_${payload.sub.slice(0, 8)}`;
    const shareData = {
      id: shareId,
      fileUrl,
      title: title || fileName,
      fileName,
      language: language || "txt",
      authorName: authorName || payload.email || "مستخدم",
      authorId: payload.sub,
      showAuthor: showAuthor !== false,
      note: note || "",
      level: level || payload.level || "LEVEL_1",
      createdAt: new Date().toISOString(),
    };

    // تخزين في SystemConfig
    const existingShares = await prisma.systemConfig.findFirst({
      where: { key: "code_editor_shares" },
    });

    let shares = [];
    if (existingShares) {
      try {
        shares = JSON.parse(existingShares.value);
      } catch {}
    }
    shares.unshift(shareData);

    // حد أقصى 200 ملف مشترك
    if (shares.length > 200) shares = shares.slice(0, 200);

    await prisma.systemConfig.upsert({
      where: { key: "code_editor_shares" },
      update: { value: JSON.stringify(shares) },
      create: { key: "code_editor_shares", value: JSON.stringify(shares) },
    });

    // إرسال إشعار عبر Supabase Realtime
    broadcastEvent("code-editor", "file-shared", {
      fileName,
      level: level || payload.level,
      authorName: showAuthor !== false ? payload.email : "مجهول",
    });

    // إرسال إشعارات داخلية للمستخدمين في نفس المستوى
    const usersInLevel = await prisma.user.findMany({
      where: {
        level: (level || payload.level) as any,
        deletedAt: null,
        isActivated: true,
      },
      select: { id: true },
    });

    // إنشاء إشعارات داخلية دفعة واحدة
    const notificationsData = usersInLevel
      .filter((u) => u.id !== payload.sub)
      .map((u) => ({
        userId: u.id,
        type: "NEW_CONTENT" as const,
        title: "📢 ملف مشترك جديد",
        body: `تمت مشاركة ملف "${fileName}" في محرر الأكواد`,
        linkUrl: "/code-editor/shared",
      }));

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({
        data: notificationsData,
      });
    }

    // إرسال إشعارات خارجية (Push)
    const userIds = usersInLevel
      .filter((u) => u.id !== payload.sub)
      .map((u) => u.id);
    if (userIds.length > 0) {
      await sendPushToUsers(userIds, {
        title: "📢 ملف مشترك جديد",
        body: `تمت مشاركة ملف "${fileName}" في محرر الأكواد`,
        data: { url: "/code-editor/shared" },
        sound: "/sounds/alert.mp3",
        requireInteraction: true,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, message: "تمت المشاركة بنجاح" });
  } catch (error) {
    console.error("Share error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في المشاركة" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 },
      );
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 },
      );
    }

    // فقط للأدمن والإدارة
    const effectiveRole = payload.managementLevel ? "MANAGEMENT" : payload.role;
    if (effectiveRole !== "ADMIN" && effectiveRole !== "MANAGEMENT") {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 403 },
      );
    }

    const { id, showAuthor } = await request.json();

    const existingShares = await prisma.systemConfig.findFirst({
      where: { key: "code_editor_shares" },
    });

    if (existingShares) {
      let shares = JSON.parse(existingShares.value);
      shares = shares.map((s: any) => {
        if (s.id === id) {
          return { ...s, showAuthor };
        }
        return s;
      });

      await prisma.systemConfig.update({
        where: { key: "code_editor_shares" },
        data: { value: JSON.stringify(shares) },
      });
    }

    return NextResponse.json({ success: true, message: "تم التحديث" });
  } catch (error) {
    console.error("Share update error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في التحديث" },
      { status: 500 },
    );
  }
}

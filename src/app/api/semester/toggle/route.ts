import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

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
    if (
      !payload ||
      (payload.role !== "ADMIN" &&
        payload.role !== "MANAGEMENT" &&
        !payload.managementLevel)
    ) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { subjectIds, isVisible } = body;

    if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "يرجى تحديد المواد" },
        { status: 400 },
      );
    }

    // عزل المستوى: MANAGEMENT يستطيع فقط تعديل مواد من مستواه
    if (payload.role !== "ADMIN") {
      const userLevel = payload.level;
      const subjects = await prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { level: true },
      });
      const allFromSameLevel = subjects.every((s) => s.level === userLevel);
      if (!allFromSameLevel || subjects.length !== subjectIds.length) {
        return NextResponse.json(
          { success: false, error: "لا يمكنك تعديل مواد من مستوى آخر" },
          { status: 403 },
        );
      }
    }

    // تحديث حالة isVisible للمواد المحددة
    await prisma.subject.updateMany({
      where: { id: { in: subjectIds } },
      data: { isVisible },
    });

    // تسجيل العملية
    const subjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { name: true, level: true, semester: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: payload.sub,
        action: "SEMESTER_SWITCH",
        severity: "INFO",
        description: `تم ${isVisible ? "إظهار" : "إخفاء"} ${subjectIds.length} مادة`,
        metadata: {
          subjects: subjects.map((s) => ({
            name: s.name,
            level: s.level,
            semester: s.semester,
          })),
          isVisible,
        },
      },
    });

    // إرسال حدث Supabase Broadcast
    try {
      const { broadcastEvent } = await import("@/lib/supabaseRealtime");
      broadcastEvent("semester", "subjects-update", {
        timestamp: new Date().toISOString(),
        isVisible,
        count: subjectIds.length,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `تم ${isVisible ? "إظهار" : "إخفاء"} ${subjectIds.length} مادة بنجاح`,
    });
  } catch (error) {
    console.error("Toggle subjects error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في تحديث المواد" },
      { status: 500 },
    );
  }
}

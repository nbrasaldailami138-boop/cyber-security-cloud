import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";
import { sendPushNotification } from "@/lib/pushNotifications";

const levelOrder: Record<string, string | null> = {
  LEVEL_1: "LEVEL_2",
  LEVEL_2: "LEVEL_3",
  LEVEL_3: "LEVEL_4",
  LEVEL_4: null,
};

const levelLabels: Record<string, string> = {
  LEVEL_1: "المستوى الأول",
  LEVEL_2: "المستوى الثاني",
  LEVEL_3: "المستوى الثالث",
  LEVEL_4: "المستوى الرابع",
};

export async function GET(request: NextRequest) {
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

    const effectiveRole = payload.managementLevel ? "MANAGEMENT" : payload.role;
    const userLevel = payload.level || "LEVEL_1";

    const levels = ["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"];
    const availableLevels =
      effectiveRole === "ADMIN"
        ? ["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"]
        : [userLevel];

    const data = await Promise.all(
      availableLevels.map(async (level) => {
        const nextLevel = levelOrder[level];
        const students = await prisma.user.findMany({
          where: { level: level as any, role: "STUDENT", deletedAt: null },
          select: {
            id: true,
            name: true,
            email: true,
            level: true,
            createdAt: true,
          },
          orderBy: { name: "asc" },
        });

        return {
          level,
          label: levelLabels[level] || level,
          totalStudents: students.length,
          students,
          nextLevel,
          nextLabel: nextLevel ? levelLabels[nextLevel] : null,
        };
      }),
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Promote preview error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في جلب البيانات" },
      { status: 500 },
    );
  }
}

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
    const { level, studentIds } = body;

    if (
      !level ||
      !studentIds ||
      !Array.isArray(studentIds) ||
      studentIds.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "يرجى تحديد المستوى والطلاب" },
        { status: 400 },
      );
    }

    const nextLevel = levelOrder[level];
    if (!nextLevel) {
      return NextResponse.json(
        { success: false, error: "لا يوجد مستوى أعلى للترقية" },
        { status: 400 },
      );
    }

    // التحقق من أن جميع الطلاب في المستوى المحدد
    const students = await prisma.user.findMany({
      where: { id: { in: studentIds }, role: "STUDENT", deletedAt: null },
      select: { id: true, name: true, level: true },
    });

    const invalidStudents = students.filter((s) => s.level !== level);
    if (invalidStudents.length > 0) {
      return NextResponse.json(
        { success: false, error: "بعض الطلاب ليسوا في المستوى المحدد" },
        { status: 400 },
      );
    }

    // تنفيذ الترقية
    await prisma.$transaction(async (tx) => {
      // 1. تحديث مستوى الطلاب
      await tx.user.updateMany({
        where: { id: { in: studentIds } },
        data: {
          level: nextLevel as any,
          previousLevel: level as any,
        },
      });

      // 2. حذف تكاليفهم القديمة
      await tx.assignment.deleteMany({
        where: { studentId: { in: studentIds } },
      });

      // 3. حذف درجاتهم القديمة
      await tx.gradeDistribution.deleteMany({
        where: {
          level: level as any,
        },
      });

      // 4. حذف محادثاتهم القديمة
      await tx.message.updateMany({
        where: {
          OR: [
            { senderId: { in: studentIds } },
            { receiverId: { in: studentIds } },
          ],
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      // 5. تسجيل العملية لكل طالب
      for (const student of students) {
        await tx.auditLog.create({
          data: {
            userId: student.id,
            action: "PROMOTED",
            severity: "INFO",
            description: `تمت ترقية الطالب من ${levelLabels[level]} إلى ${levelLabels[nextLevel]}`,
            level: nextLevel as any,
            metadata: {
              fromLevel: level,
              toLevel: nextLevel,
              promotedBy: payload.sub,
            },
          },
        });

        // 6. إرسال إشعار داخلي
        await tx.notification.create({
          data: {
            userId: student.id,
            type: "LEVEL_PROMOTED",
            title: "🎉 مبارك انتقالك!",
            body: `تمت ترقيتك إلى ${levelLabels[nextLevel]} في كلية الأمن السيبراني. نتمنى لك عالماً من النجاح والتفوق في عامك الدراسي الجديد. واصل الاجتهاد فأنت مستقبل هذا الوطن 🇾🇪`,
            linkUrl: "/student",
          },
        });
      }
    });

    // إرسال إشعارات خارجية (Push) مع صوت
    try {
      const { sendPushToUsers } = await import("@/lib/pushNotifications");
      await sendPushToUsers(
        students.map((s) => s.id),
        {
          title: "🎉 مبارك انتقالك!",
          body: `تمت ترقيتك إلى ${levelLabels[nextLevel]} في كلية الأمن السيبراني.`,
          data: { url: "/student" },
          sound: "/sounds/alert.mp3",
          requireInteraction: true,
        },
      );
    } catch {}

    // إرسال حدث Supabase Realtime
    try {
      const { broadcastEvent } = await import("@/lib/supabaseRealtime");
      broadcastEvent("semester", "promotion-update", {
        timestamp: new Date().toISOString(),
        fromLevel: level,
        toLevel: nextLevel,
        count: students.length,
      });
      broadcastEvent("semester", "stats-update", {
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `تم ترقية ${students.length} طالب إلى ${levelLabels[nextLevel]} بنجاح`,
    });
  } catch (error) {
    console.error("Promote error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في ترقية الطلاب" },
      { status: 500 },
    );
  }
}

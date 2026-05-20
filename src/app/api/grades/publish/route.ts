import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/supabaseRealtime";
import { sendPushToUsers } from "@/lib/pushNotifications";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken)
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 },
      );

    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET);
    const userId = payload.sub as string;

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { role: true, managementLevel: true, name: true, level: true },
    });
    if (!user)
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );

    const hasAccess =
      user.role === "TEACHER" ||
      user.role === "ADMIN" ||
      !!user.managementLevel;
    if (!hasAccess)
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );

    const body = await request.json();
    const { distributionId, students, publishType, manualStudents, subjectId } =
      body;

    let subjectName = "";
    let targetLevel = user.level || "";
    const studentNotifications: {
      id: string;
      grade: string;
      feedback: string;
    }[] = [];

    // ========== نشر يدوي ==========
    if (manualStudents?.length) {
      const subject = subjectId
        ? await prisma.subject.findUnique({
            where: { id: subjectId },
            select: { name: true, level: true },
          })
        : null;
      subjectName = subject?.name || "المادة";
      if (subject?.level) targetLevel = subject.level;

      for (const s of manualStudents) {
        if (s.grade || s.feedback) {
          studentNotifications.push({
            id: s.id,
            grade: s.grade || "—",
            feedback: s.feedback || "",
          });
          // تحديث أو إنشاء تكليف للطالب
          await prisma.assignment.create({
            data: {
              studentId: s.id,
              subjectId: subjectId || "",
              fileUrl: "",
              fileName: "نشر يدوي",
              fileSize: 0,
              grade: s.grade ? parseFloat(s.grade) || 0 : null,
              feedback: s.feedback || null,
              status: s.grade ? "evaluated" : "pending",
              evaluatedAt: s.grade ? new Date() : null,
              evaluatorId: userId,
              semester: "TERM_1",
            },
          });
        }
      }
    }

    // ========== نشر من تحليل ==========
    if (distributionId && students?.length) {
      const distribution = await prisma.gradeDistribution.findUnique({
        where: { id: distributionId },
        include: { subject: { select: { name: true, code: true } } },
      });
      if (!distribution)
        return NextResponse.json(
          { success: false, message: "التوزيع غير موجود" },
          { status: 404 },
        );
      subjectName = distribution.subject.name;
      targetLevel = distribution.level || targetLevel;

      await prisma.gradeDistribution.update({
        where: { id: distributionId },
        data: {
          distributionData: {
            students,
            publishedAt: new Date().toISOString(),
            publishedBy: user.name,
            publishType,
          },
          studentsCount: students.length,
        },
      });

      for (const s of students) {
        if (s.dbId && s.grade) {
          studentNotifications.push({
            id: s.dbId,
            grade: s.grade,
            feedback: s.feedback || "",
          });
        }
      }
    }

    // ========== إرسال الإشعارات ==========
    if (studentNotifications.length > 0) {
      const msgType = publishType || "التقييم";

      // إنشاء إشعارات داخلية دفعة واحدة
      const notificationsData = studentNotifications.map((sn) => {
        let body = `قام معلم ${subjectName} برفع درجاتك في ${msgType}. درجتك: ${sn.grade}`;
        if (sn.feedback) body += ` - ملاحظة: ${sn.feedback}`;
        return {
          userId: sn.id,
          type: "GRADES_DISTRIBUTED" as const,
          title: "📊 توزيع درجات",
          body,
          linkUrl: "/student",
        };
      });

      if (notificationsData.length > 0) {
        await prisma.notification.createMany({
          data: notificationsData,
        });
      }

      // إشعار لحظي لجميع طلاب المستوى دفعة واحدة
      broadcastEvent(`level-${targetLevel}`, "grades-published", {
        type: "GRADES_DISTRIBUTED",
        title: "📊 توزيع درجات",
        body: `قام معلم ${subjectName} برفع درجات ${msgType} لـ ${studentNotifications.length} طالب`,
        linkUrl: "/student",
        level: targetLevel,
      });

      // إرسال Push Notifications
      try {
        await sendPushToUsers(
          studentNotifications.map((s) => s.id),
          {
            title: "📊 توزيع درجات",
            body: `قام معلم ${subjectName} برفع درجاتك في ${msgType}`,
            data: { url: "/student" },
            sound: "/sounds/notification.mp3",
          },
        );
      } catch {}
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: "PUBLISH",
        severity: "INFO",
        description: `نشر درجات ${subjectName} لـ ${studentNotifications.length} طالب`,
        level: targetLevel as any,
        metadata: {
          distributionId,
          studentsCount: studentNotifications.length,
          publishType,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `تم نشر الدرجات لـ ${studentNotifications.length} طالب`,
    });
  } catch (error: any) {
    console.error("Publish Grades Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { APP_CONFIG } from "@/config";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export const dynamic = "force-dynamic";

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

    // جلب المستخدم للتحقق من managementLevel
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { role: true, managementLevel: true, level: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    const isTeacher = user.role === "TEACHER";
    const isManagement = user.role === "MANAGEMENT" || !!user.managementLevel;
    const isAdmin = user.role === "ADMIN";

    // الطالب، المعلم، الإدارة، الأدمن - الكل مسموح
    if (userRole !== "STUDENT" && !isTeacher && !isManagement && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      50,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || String(APP_CONFIG.itemsPerPage)),
      ),
    );

    // ========== للطالب: جلب درجاته ==========
    if (userRole === "STUDENT") {
      const semester = searchParams.get("semester") || undefined;

      const where: any = {
        studentId: userId,
        grade: { not: null },
        deletedAt: null,
      };

      if (semester) where.semester = semester;

      const [assignments, total] = await Promise.all([
        prisma.assignment.findMany({
          where,
          include: {
            subject: { select: { name: true } },
            evaluator: { select: { name: true } },
          },
          orderBy: { evaluatedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.assignment.count({ where }),
      ]);

      const data = assignments.map((a) => ({
        id: a.id,
        subjectName: a.subject.name,
        grade: a.grade,
        feedback: a.feedback,
        evaluatorName: a.evaluator?.name || null,
        evaluatedAt: a.evaluatedAt,
        semester: a.semester,
      }));

      return NextResponse.json({
        success: true,
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

    // ========== للمعلم: جلب سجل توزيعات الدرجات ==========
    const whereDist: any = { deletedAt: null };

    if (isTeacher) {
      whereDist.teacherId = userId;
    }

    const [distributions, total] = await Promise.all([
      prisma.gradeDistribution.findMany({
        where: whereDist,
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          studentsCount: true,
          createdAt: true,
          distributionData: true,
          subject: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.gradeDistribution.count({ where: whereDist }),
    ]);

    const data = distributions.map((d) => ({
      id: d.id,
      subjectName: d.subject?.name || "—",
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      studentsCount: d.studentsCount,
      createdAt: d.createdAt,
      distributionData: d.distributionData,
    }));

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Grades List Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { id } = await request.json();
    if (!id)
      return NextResponse.json(
        { success: false, message: "المعرف مطلوب" },
        { status: 400 },
      );

    const dist = await prisma.gradeDistribution.findUnique({ where: { id } });
    if (!dist)
      return NextResponse.json(
        { success: false, message: "غير موجود" },
        { status: 404 },
      );
    if (dist.teacherId !== userId && payload.role !== "ADMIN")
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );

    await prisma.gradeDistribution.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "تم الحذف" });
  } catch {
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { APP_CONFIG } from "@/config";

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
    const userRole = payload.role as string;

    if (userRole !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || String(APP_CONFIG.itemsPerPage))),
    );
    const semester = searchParams.get("semester") || undefined;

    const where: any = {
      studentId: userId,
      grade: { not: null },
      deletedAt: null,
    };

    if (semester) {
      where.semester = semester;
    }

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
  } catch (error: any) {
    console.error("Grades List Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

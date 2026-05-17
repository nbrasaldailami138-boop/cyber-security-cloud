import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");
    const semester = searchParams.get("semester") || null;
    const teacherId = searchParams.get("teacherId");

    if (!level) {
      return NextResponse.json(
        { success: false, message: "المستوى الدراسي مطلوب" },
        { status: 400 },
      );
    }

    const where: any = {
      level: level as any,
      isActive: true,
      isVisible: true,
      deletedAt: null,
    };

    if (semester) {
      where.semester = semester as any;
    }

    if (teacherId) {
      where.teacherId = teacherId;
    }

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        teacher: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    const data = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      level: s.level,
      semester: s.semester,
      teacherName: s.teacher?.name || null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Subjects Active Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

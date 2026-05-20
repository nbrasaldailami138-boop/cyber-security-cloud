import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

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
    const userLevel = payload.level;

    const levels = ["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"];
    const levelLabels: Record<string, string> = {
      LEVEL_1: "المستوى الأول",
      LEVEL_2: "المستوى الثاني",
      LEVEL_3: "المستوى الثالث",
      LEVEL_4: "المستوى الرابع",
    };

    const availableLevels: string[] =
      effectiveRole === "ADMIN"
        ? ["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"]
        : userLevel
          ? [userLevel]
          : [];

    const levelBreakdown = await Promise.all(
      availableLevels.map(async (level) => {
        const [term1Subjects, term2Subjects, totalStudents, lastPromotion] =
          await Promise.all([
            prisma.subject.count({
              where: {
                level: level as any,
                semester: "TERM_1",
                deletedAt: null,
              },
            }),
            prisma.subject.count({
              where: {
                level: level as any,
                semester: "TERM_2",
                deletedAt: null,
              },
            }),
            prisma.user.count({
              where: { level: level as any, role: "STUDENT", deletedAt: null },
            }),
            prisma.auditLog.findFirst({
              where: { action: "PROMOTED", level: level as any },
              orderBy: { createdAt: "desc" },
              select: { createdAt: true },
            }),
          ]);

        return {
          level,
          label: levelLabels[level] || level,
          term1Subjects,
          term2Subjects,
          totalStudents,
          lastPromotion: lastPromotion?.createdAt?.toISOString() || null,
        };
      }),
    );

    const totalSubjects = levelBreakdown.reduce(
      (sum, l) => sum + l.term1Subjects + l.term2Subjects,
      0,
    );

    return NextResponse.json({
      success: true,
      data: {
        totalLevels: availableLevels.length,
        totalSubjects,
        levelBreakdown,
      },
    });
  } catch (error) {
    console.error("Semester stats error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في جلب الإحصائيات" },
      { status: 500 },
    );
  }
}

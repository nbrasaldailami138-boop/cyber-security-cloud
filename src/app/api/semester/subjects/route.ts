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
    const availableLevels: string[] =
      effectiveRole === "ADMIN"
        ? ["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"]
        : userLevel
          ? [userLevel]
          : [];

    const levelLabels: Record<string, string> = {
      LEVEL_1: "المستوى الأول",
      LEVEL_2: "المستوى الثاني",
      LEVEL_3: "المستوى الثالث",
      LEVEL_4: "المستوى الرابع",
    };

    const data = await Promise.all(
      availableLevels.map(async (level) => {
        const [term1Subjects, term2Subjects] = await Promise.all([
          prisma.subject.findMany({
            where: { level: level as any, semester: "TERM_1", deletedAt: null },
            select: {
              id: true,
              name: true,
              code: true,
              isVisible: true,
              teacher: { select: { name: true } },
            },
            orderBy: { name: "asc" },
          }),
          prisma.subject.findMany({
            where: { level: level as any, semester: "TERM_2", deletedAt: null },
            select: {
              id: true,
              name: true,
              code: true,
              isVisible: true,
              teacher: { select: { name: true } },
            },
            orderBy: { name: "asc" },
          }),
        ]);

        return {
          level,
          label: levelLabels[level] || level,
          term1Subjects,
          term2Subjects,
        };
      }),
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Semester subjects error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في جلب المواد" },
      { status: 500 },
    );
  }
}

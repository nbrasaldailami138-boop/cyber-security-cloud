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
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedLevel = searchParams.get("level");
    const effectiveRole = payload.managementLevel ? "MANAGEMENT" : payload.role;
    const userLevel = payload.level || "LEVEL_1";

    // الأدمن يختار المستوى، وغيره يرى مستواه فقط
    const level =
      effectiveRole === "ADMIN" ? requestedLevel || userLevel : userLevel;

    const existingShares = await prisma.systemConfig.findFirst({
      where: { key: "code_editor_shares" },
    });

    let shares: any[] = [];
    if (existingShares) {
      try {
        shares = JSON.parse(existingShares.value);
      } catch {}
    }

    // فلترة حسب المستوى
    const filtered = shares.filter((s: any) => s.level === level);

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    console.error("Shared list error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في جلب الملفات" },
      { status: 500 },
    );
  }
}

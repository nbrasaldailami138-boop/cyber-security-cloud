import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken)
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 },
      );

    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET);
    if (payload.role !== "ADMIN" && payload.role !== "MANAGEMENT") {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const level = searchParams.get("level");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    const userLevel = payload.level as string | undefined;
    if (payload.role === "MANAGEMENT" && userLevel) {
      where.toLevel = userLevel;
    } else if (level) {
      where.toLevel = level;
    }

    const [data, total] = await Promise.all([
      prisma.promotionRequest.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, level: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.promotionRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Promotion list error:", error);
    return NextResponse.json({ success: false, error: "خطأ في جلب طلبات الترقية" }, { status: 500 });
  }
}

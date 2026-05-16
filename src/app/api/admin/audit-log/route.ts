import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET);
    const userId = payload.sub as string;

    // جلب المستخدم للتحقق من managementLevel
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { role: true, level: true, managementLevel: true },
    });

    if (!user) return NextResponse.json({ success: false }, { status: 403 });

    const effectiveRole = user.managementLevel ? "MANAGEMENT" : user.role;
    if (effectiveRole !== "ADMIN" && effectiveRole !== "MANAGEMENT") {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20")),
    );

    const where: any = {};
    if (effectiveRole === "MANAGEMENT" && user.managementLevel) {
      where.level = user.managementLevel;
    } else if (effectiveRole === "MANAGEMENT" && user.level) {
      where.level = user.level;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: logs, total, page, limit });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

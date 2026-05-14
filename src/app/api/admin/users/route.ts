import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

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
    if (payload.role !== "ADMIN" && payload.role !== "MANAGEMENT") {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );
    }

    const userRole = payload.role as string;
    const userLevel = payload.level as string;

    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const email = searchParams.get("email");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20")),
    );

    const where: any = { deletedAt: null };

    // عزل أكاديمي للإدارة
    if (userRole === "MANAGEMENT" && userLevel) {
      where.level = userLevel;
    } else if (level) {
      where.level = level;
    }

    if (role) where.role = role;
    if (status) where.status = status;

    // البحث بالاسم
    if (search && search.trim()) {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }

    // البحث بالإيميل
    if (email && email.trim()) {
      where.email = { contains: email.trim(), mode: "insensitive" };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          level: true,
          status: true,
          isActivated: true,
          createdAt: true,
          managementLevel: true,
          lastLoginAt: true,
          uploadPermissions: {
            where: { revokedAt: null },
            select: {
              id: true,
              grantedBy: true,
              grantedAt: true,
            },
            orderBy: { grantedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: users,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error("Get Users Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}

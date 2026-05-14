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
    const userId = payload.sub as string;
    const userRole = payload.role as string;
    const userLevel = payload.level as string | undefined;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const filterLevel = searchParams.get("level") || "";
    const filterRole = searchParams.get("role") || "";

    const where: any = {
      id: { not: userId },
      deletedAt: null,
      isActivated: true,
    };

    if (search && search.trim()) {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }

    // العزل الأكاديمي
    if (userRole === "STUDENT") {
      where.OR = [
        { role: "ADMIN" },
        { role: "MANAGEMENT", level: userLevel },
        { role: "TEACHER", level: userLevel },
      ];
    } else if (userRole === "TEACHER") {
      where.OR = [
        { role: "ADMIN" },
        { role: "MANAGEMENT", level: userLevel },
        { role: "STUDENT", level: userLevel },
      ];
    } else if (userRole === "MANAGEMENT") {
      if (filterRole === "STUDENT") {
        where.role = "STUDENT";
        where.level = userLevel;
      } else if (filterRole === "TEACHER") {
        where.role = "TEACHER";
        where.level = userLevel;
      } else {
        where.OR = [
          { role: "ADMIN" },
          { role: "TEACHER", level: userLevel },
          { role: "STUDENT", level: userLevel },
        ];
      }
    } else if (userRole === "ADMIN") {
      if (filterLevel) where.level = filterLevel;
      if (filterRole) where.role = filterRole;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        role: true,
        level: true,
        lastSeenAt: true,
        lastLoginAt: true,
      },
      orderBy: { name: "asc" },
      take: 50,
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error("Search Users Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

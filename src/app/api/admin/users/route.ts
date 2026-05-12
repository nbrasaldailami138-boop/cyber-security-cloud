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

    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    const where: any = { deletedAt: null };

    // عزل أكاديمي للإدارة
    if (payload.role === "MANAGEMENT" && payload.level) {
      where.level = payload.level as string;
    } else if (level) {
      where.level = level;
    }

    if (role) where.role = role;
    if (status) where.status = status;

    const users = await prisma.user.findMany({
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
        lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // جلب الأكواد غير المستخدمة
    const codes = await prisma.activationCode.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
        ...(payload.role === "MANAGEMENT" && payload.level
          ? { level: payload.level as any }
          : {}),
        ...(level ? { level: level as any } : {}),
      },
      select: {
        id: true,
        codeHash: true,
        level: true,
        role: true,
        createdAt: true,
        expiresAt: true,
        usedAt: true,
        usedBy: true,
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: { users, codes },
    });
  } catch (error: any) {
    console.error("Get Users Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}

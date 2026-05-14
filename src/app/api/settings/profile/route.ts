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
    const userId = payload.sub as string;

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        level: true,
        status: true,
        isActivated: true,
        twoFactorEnabled: true,
        webAuthnEnabled: true,
        createdAt: true,
        lastLoginAt: true,
        uploadPermissions: {
          where: { revokedAt: null },
          select: { id: true, grantedAt: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    const assignmentsCount = await prisma.assignment.count({
      where: { studentId: userId, deletedAt: null },
    });

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        stats: { assignmentsCount },
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

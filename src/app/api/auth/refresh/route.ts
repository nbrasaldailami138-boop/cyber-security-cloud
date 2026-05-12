import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyRefreshToken,
  generateAccessToken,
  setAuthCookies,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: "لا توجد جلسة نشطة" },
        { status: 401 },
      );
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "جلسة منتهية أو غير صالحة" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "الحساب غير نشط" },
        { status: 403 },
      );
    }

    // توليد Access Token جديد
    const accessToken = await generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      level: user.level || undefined,
    });

    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({
      success: true,
      message: "تم تجديد الجلسة",
      token: accessToken,
    });
  } catch (error: any) {
    console.error("Refresh Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}

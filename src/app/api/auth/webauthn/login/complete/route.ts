import { NextRequest, NextResponse } from "next/server";
import { verifyAuthentication } from "@/lib/webauthn";
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, authResponse } = body;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    if (!userId || !authResponse) {
      return NextResponse.json(
        { success: false, message: "بيانات غير كافية" },
        { status: 400 },
      );
    }

    // التحقق من البصمة
    await verifyAuthentication(userId, authResponse);

    // جلب بيانات المستخدم
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    // توليد التوكنات
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      level: user.level || undefined,
    };

    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(user.id);

    await setAuthCookies(accessToken, refreshToken);

    // تحديث آخر دخول
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    // تسجيل العملية
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        severity: "INFO",
        description: "تسجيل دخول بالبصمة",
        ipAddress: ip,
        level: user.level,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم الدخول بالبصمة بنجاح",
      role: user.role,
      level: user.level,
    });
  } catch (error: any) {
    console.error("WebAuthn Login Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

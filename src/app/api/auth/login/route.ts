import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from "@/lib/auth";
import { loginRateLimiter } from "@/lib/ratelimit";
import argon2 from "argon2";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(3, "الاسم قصير جداً"),
  password: z.string().min(6, "كلمة المرور قصيرة جداً"),
});

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success: rateLimitOk } = await loginRateLimiter.limit(ip);
    if (!rateLimitOk) {
      return NextResponse.json(
        { success: false, message: "محاولات كثيرة. حاول مرة أخرى بعد دقيقة." },
        { status: 429 },
      );
    }

    // التحقق من صحة المدخلات
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { username, password } = validation.data;

    // البحث عن المستخدم (بالبريد الإلكتروني أو الاسم)
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: username }, { name: username }],
        deletedAt: null,
      },
    });

    if (!user) {
      await prisma.auditLog.create({
        data: {
          action: "FAILED_LOGIN",
          severity: "WARNING",
          description: `محاولة دخول فاشلة: المستخدم غير موجود (${username})`,
          ipAddress: ip,
        },
      });
      return NextResponse.json(
        { success: false, message: "البيانات المدخلة غير صحيحة" },
        { status: 401 },
      );
    }

    // التحقق من حالة الحساب
    if (user.status === "LOCKED" || user.status === "SUSPENDED") {
      // التحقق من انتهاء مدة القفل
      if (user.lockedUntil && new Date() > user.lockedUntil) {
        await prisma.user.update({
          where: { id: user.id },
          data: { status: "ACTIVE", failedLoginAttempts: 0, lockedUntil: null },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "الحساب مقفل مؤقتاً. حاول مرة أخرى لاحقاً.",
          },
          { status: 403 },
        );
      }
    }

    // التحقق من التفعيل
    if (!user.isActivated) {
      return NextResponse.json(
        {
          success: false,
          message: "الحساب غير مفعل. يرجى تفعيل الحساب أولاً.",
        },
        { status: 403 },
      );
    }

    // التحقق من كلمة المرور
    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      // زيادة عداد المحاولات الفاشلة
      const failedAttempts = user.failedLoginAttempts + 1;
      const maxAttempts = 5;
      const shouldLock = failedAttempts >= maxAttempts;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          status: shouldLock ? "LOCKED" : user.status,
          lockedUntil: shouldLock
            ? new Date(Date.now() + 15 * 60 * 1000)
            : null,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "FAILED_LOGIN",
          severity: "WARNING",
          description: `محاولة دخول فاشلة (${failedAttempts}/${maxAttempts})`,
          ipAddress: ip,
        },
      });

      return NextResponse.json(
        { success: false, message: "البيانات المدخلة غير صحيحة" },
        { status: 401 },
      );
    }

    // إعادة تعيين عداد المحاولات الفاشلة
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    // توليد التوكنات
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      level: user.level || undefined,
    };

    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(user.id);

    // تعيين الكوكيز
    await setAuthCookies(accessToken, refreshToken);

    // تسجيل العملية
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        severity: "INFO",
        description: `تسجيل دخول ناجح`,
        ipAddress: ip,
        level: user.level,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      token: accessToken, // للـ localStorage (اختياري)
      role: user.role,
      level: user.level,
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}

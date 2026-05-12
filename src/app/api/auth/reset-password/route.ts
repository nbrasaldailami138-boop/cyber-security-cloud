import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/security";
import argon2 from "argon2";
import { revokeAllSessions } from "@/lib/auth";
import { z } from "zod";

const resetSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  code: z.string().min(6, "كود التحقق غير صحيح"),
  newPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = resetSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, code, newPassword } = validation.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "بريد إلكتروني غير موجود" },
        { status: 404 },
      );
    }

    // التحقق من الكود مرة أخرى
    const codeHash = hashToken(code);
    if (
      user.activationCodeHash !== codeHash ||
      !user.activationExpires ||
      new Date() > user.activationExpires
    ) {
      return NextResponse.json(
        { success: false, message: "كود التحقق غير صحيح أو منتهي الصلاحية" },
        { status: 400 },
      );
    }

    // تشفير كلمة المرور الجديدة
    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // تحديث كلمة المرور
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        activationCodeHash: null,
        activationExpires: null,
        failedLoginAttempts: 0,
        status: "ACTIVE",
        lockedUntil: null,
      },
    });

    // إبطال جميع الجلسات السابقة (أمان)
    await revokeAllSessions(user.id);

    // تسجيل العملية
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        severity: "WARNING",
        description: "تم تغيير كلمة المرور",
        ipAddress: ip,
        level: user.level,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.",
    });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/security";
import argon2 from "argon2";
import { z } from "zod";
import crypto from "crypto";

const activateSchema = z
  .object({
    code: z.string().min(6, "كود التفعيل غير صحيح"),
    email: z.string().email("بريد إلكتروني غير صالح"),
    password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = activateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { code, email, password } = validation.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // التحقق من وجود المستخدم
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "البريد الإلكتروني غير موجود في النظام" },
        { status: 404 },
      );
    }

    if (user.isActivated) {
      return NextResponse.json(
        { success: false, message: "الحساب مفعل بالفعل" },
        { status: 400 },
      );
    }

    // التحقق من كود التفعيل
    const codeHash = hashToken(code);
    const activationCode = await prisma.activationCode.findFirst({
      where: {
        codeHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!activationCode) {
      return NextResponse.json(
        { success: false, message: "كود التفعيل غير صحيح أو منتهي الصلاحية" },
        { status: 400 },
      );
    }

    // تشفير كلمة المرور
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // تحديث المستخدم
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isActivated: true,
        status: "ACTIVE",
        activationCodeHash: null,
        activationExpires: null,
      },
    });

    // تحديث كود التفعيل كمستخدم
    await prisma.activationCode.update({
      where: { id: activationCode.id },
      data: {
        usedAt: new Date(),
        usedBy: user.id,
      },
    });

    // تسجيل العملية
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        severity: "INFO",
        description: "تم تفعيل الحساب بنجاح",
        ipAddress: ip,
        level: user.level,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "تم تفعيل الحساب بنجاح. يمكنك الآن تسجيل الدخول.",
    });
  } catch (error: any) {
    console.error("Activate Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}

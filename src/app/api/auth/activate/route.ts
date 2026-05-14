import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/security";
import { verifyCaptcha } from "@/lib/captcha";
import argon2 from "argon2";
import { z } from "zod";

const activateSchema = z
  .object({
    code: z.string().min(4, "كود التفعيل غير صحيح"),
    email: z.string().email("بريد إلكتروني غير صالح"),
    password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    confirmPassword: z.string(),
    captchaToken: z.string().optional(),
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

    const { code, email, password, captchaToken } = validation.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // التحقق من CAPTCHA
    const captchaOk = await verifyCaptcha(captchaToken || null);
    if (!captchaOk) {
      return NextResponse.json(
        { success: false, message: "التحقق البشري فشل. حاول مرة أخرى." },
        { status: 400 },
      );
    }

    const codeHash = hashToken(code);

    // البحث عن المستخدم بواسطة كود التفعيل (وليس البريد الإلكتروني)
    const user = await prisma.user.findFirst({
      where: {
        activationCodeHash: codeHash,
        isActivated: false,
        status: "PENDING",
        deletedAt: null,
      },
    });

    if (!user) {
      const activationCode = await prisma.activationCode.findFirst({
        where: { codeHash, usedAt: null, expiresAt: { gt: new Date() } },
      });
      if (!activationCode) {
        return NextResponse.json(
          { success: false, message: "كود التفعيل غير صحيح أو منتهي الصلاحية" },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { success: false, message: "المستخدم المرتبط بكود التفعيل غير موجود" },
        { status: 404 },
      );
    }

    if (user.isActivated) {
      return NextResponse.json(
        { success: false, message: "الحساب مفعل بالفعل" },
        { status: 400 },
      );
    }

    // التحقق من أن البريد الإلكتروني غير مستخدم مسبقاً
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail && existingEmail.id !== user.id) {
      return NextResponse.json(
        { success: false, message: "البريد الإلكتروني مستخدم بالفعل في حساب آخر" },
        { status: 400 },
      );
    }

    // التحقق من صحة كود التفعيل في جدول الأكواد
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

    // تحديث المستخدم: حفظ البريد الإلكتروني الشخصي + كلمة المرور + تفعيل الحساب
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
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
      data: {
        role: user.role,
        level: user.level,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error("Activate Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, generateResetPasswordEmail } from "@/lib/email";
import { passwordResetRateLimiter } from "@/lib/ratelimit";
import { generateSecureToken, hashToken } from "@/lib/security";
import { verifyCaptcha } from "@/lib/captcha";
import { z } from "zod";

const forgotSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  captchaToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // Rate Limiting
    const { success: rateLimitOk } = await passwordResetRateLimiter.limit(ip);
    if (!rateLimitOk) {
      return NextResponse.json(
        { success: false, message: "طلبات كثيرة. حاول مرة أخرى بعد ساعة." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const validation = forgotSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, captchaToken } = validation.data;

    // التحقق من CAPTCHA (فقط إذا تم إرسال التوكن)
    if (captchaToken) {
      const captchaOk = await verifyCaptcha(captchaToken);
      if (!captchaOk) {
        return NextResponse.json(
          { success: false, message: "التحقق البشري فشل. حاول مرة أخرى." },
          { status: 400 },
        );
      }
    }

    // البحث عن المستخدم
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    // لا نكشف إذا كان المستخدم موجوداً أم لا (أمان)
    if (!user || !user.isActivated) {
      return NextResponse.json({
        success: true,
        message: "إذا كان البريد مسجلاً، سيصلك كود التحقق قريباً.",
      });
    }

    // توليد كود التحقق
    const resetCode = generateSecureToken(3).slice(0, 6).toUpperCase();
    const codeHash = hashToken(resetCode);

    // تخزين الكود مؤقتاً في بيانات المستخدم
    await prisma.user.update({
      where: { id: user.id },
      data: {
        activationCodeHash: codeHash,
        activationExpires: new Date(Date.now() + 30 * 60 * 1000), // 30 دقيقة
      },
    });

    // إرسال البريد
    const emailHtml = generateResetPasswordEmail(resetCode);
    const emailSent = await sendEmail({
      to: email,
      subject: "استعادة كلمة المرور - سحابة الأمن السيبراني",
      html: emailHtml,
    });

    if (!emailSent) {
      return NextResponse.json(
        { success: false, message: "فشل إرسال البريد. حاول مرة أخرى." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم إرسال كود التحقق إلى بريدك الإلكتروني.",
    });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from "@/lib/auth";
import { loginRateLimiter } from "@/lib/ratelimit";
import { verifyCaptcha } from "@/lib/captcha";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(3, "الاسم قصير جداً"),
  password: z.string().min(6, "كلمة المرور قصيرة جداً"),
  captchaToken: z.string().optional(),
  twoFactorToken: z.string().optional(),
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

    // التحقق من المدخلات
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { username, password, captchaToken } = validation.data;

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
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // زيادة عداد المحاولات الفاشلة
      const failedAttempts = user.failedLoginAttempts + 1;
      const maxAttempts = 5;
      // نظام المحاولات المتدرج
      // المرحلة 1: 5 محاولات → حظر 7 دقائق
      // المرحلة 2: 3 محاولات → حظر 15 دقيقة
      // المرحلة 3: 1 محاولة → حظر أسبوع + اعتبار اختراق
      let lockDurationMinutes = 7; // افتراضي للمرحلة الأولى
      let isBreachAttempt = false;
      let previousLockCount = 0;

      // جلب عدد مرات الحظر السابقة من سجل التدقيق
      const previousLocks = await prisma.auditLog.count({
        where: {
          userId: user.id,
          action: "SUSPICIOUS_ACTIVITY",
          description: { contains: "حظر" },
        },
      });

      if (previousLocks >= 2) {
        // المرحلة الثالثة: محاولة واحدة فقط
        lockDurationMinutes = 10080; // أسبوع
        isBreachAttempt = true;
      } else if (previousLocks >= 1) {
        // المرحلة الثانية: 3 محاولات
        lockDurationMinutes = 15;
      } else {
        // المرحلة الأولى: 5 محاولات
        lockDurationMinutes = 7;
      }

      const shouldLock =
        (previousLocks >= 2 && failedAttempts >= 1) ||
        (previousLocks >= 1 && failedAttempts >= 3) ||
        failedAttempts >= maxAttempts;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          status: shouldLock ? "LOCKED" : user.status,
          lockedUntil: shouldLock
            ? new Date(Date.now() + lockDurationMinutes * 60 * 1000)
            : null,
        },
      });

      // تسجيل محاولة الفشل
      const failedLog = await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "FAILED_LOGIN",
          severity: shouldLock ? "CRITICAL" : "WARNING",
          description: `محاولة دخول فاشلة (${failedAttempts}/${previousLocks >= 2 ? 1 : previousLocks >= 1 ? 3 : maxAttempts}) - المرحلة ${previousLocks >= 2 ? 3 : previousLocks >= 1 ? 2 : 1}`,
          ipAddress: ip,
          deviceInfo: request.headers.get("user-agent") || "",
        },
      });

      // إرسال حدث Supabase Broadcast لتحديث صفحات الرادار لحظياً
      try {
        const { broadcastEvent } = await import("@/lib/supabaseRealtime");
        await broadcastEvent("security-terminal", "new-log", {
          id: failedLog.id,
          action: failedLog.action,
          severity: failedLog.severity,
          description: failedLog.description,
          ipAddress: failedLog.ipAddress,
          deviceInfo: failedLog.deviceInfo,
          createdAt: failedLog.createdAt.toISOString(),
        });
        await broadcastEvent("security-radar", "stats-update", {
          timestamp: new Date().toISOString(),
        });
        await broadcastEvent("security-guardian", "new-threat", {
          id: failedLog.id,
          action: failedLog.action,
          severity: failedLog.severity,
          description: failedLog.description,
          ipAddress: failedLog.ipAddress,
          deviceInfo: failedLog.deviceInfo,
          createdAt: failedLog.createdAt.toISOString(),
          user: { name: user.name, email: user.email, role: user.role },
        });
      } catch (broadcastError) {
        console.error("Failed to send broadcast event:", broadcastError);
      }
      // إذا تم اعتبارها محاولة اختراق
      // إذا تم اعتبارها محاولة اختراق
      if (isBreachAttempt && shouldLock) {
        const auditLog = await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "SUSPICIOUS_ACTIVITY",
            severity: "CRITICAL",
            description: `🚨 محاولة اختراق - حظر أسبوع للمستخدم ${user.email} من IP ${ip}`,
            ipAddress: ip,
            deviceInfo: request.headers.get("user-agent") || "",
          },
        });

        // إرسال إشعار داخلي للأدمن
        try {
          const admins = await prisma.user.findMany({
            where: { role: "ADMIN", deletedAt: null },
            select: { id: true },
          });

          for (const admin of admins) {
            await prisma.notification.create({
              data: {
                userId: admin.id,
                type: "NEW_ANNOUNCEMENT",
                title: "🚨 محاولة اختراق",
                body: `محاولة اختراق على الحساب ${user.email} من IP ${ip}`,
                linkUrl: "/admin/security-radar/guardian",
              },
            });
          }

          // إرسال حدث Supabase Broadcast للإشعارات
          const { broadcastEvent } = await import("@/lib/supabaseRealtime");
          await broadcastEvent("security-guardian", "new-threat", {
            id: auditLog.id,
            action: auditLog.action,
            severity: auditLog.severity,
            description: auditLog.description,
            ipAddress: auditLog.ipAddress,
            deviceInfo: auditLog.deviceInfo,
            createdAt: auditLog.createdAt.toISOString(),
            user: { name: user.name, email: user.email, role: user.role },
          });

          // تحديث الإحصائيات
          await broadcastEvent("security-radar", "stats-update", {
            timestamp: new Date().toISOString(),
          });

          // إرسال إشعار خارجي (Push Notification) للأدمن
          const { sendPushNotification } =
            await import("@/lib/pushNotifications");
          for (const admin of admins) {
            await sendPushNotification(
              admin.id,
              "🚨 محاولة اختراق",
              `محاولة اختراق على الحساب ${user.email} من IP ${ip}`,
              "/admin/security-radar/guardian",
            ).catch(() => {});
            // مع صوت alert
            try {
              const { sendPushToUsers } =
                await import("@/lib/pushNotifications");
              await sendPushToUsers(
                admins.map((a: any) => a.id),
                {
                  title: "🚨 محاولة اختراق",
                  body: `محاولة اختراق على الحساب ${user.email}`,
                  data: { url: "/admin/security-radar/guardian" },
                  sound: "/sounds/alert.mp3",
                  requireInteraction: true,
                },
              );
            } catch {}
          }
        } catch (supabaseError) {
          console.error("Failed to send Supabase Broadcast event:", supabaseError);
        }

        // إرسال إيميل تحذيري للأدمن
        try {
          const { sendEmail } = await import("@/lib/email");
          await sendEmail({
            to: "nbrasalsma@gmail.com",
            subject: "🚨 تحذير أمني - محاولة اختراق - سحابة الأمن السيبراني",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 20px; border-radius: 12px; border: 1px solid #ff3131;">
                <h2 style="color: #ff3131;">🚨 تحذير أمني - محاولة اختراق</h2>
                <p><strong>المستخدم المستهدف:</strong> ${user.email}</p>
                <p><strong>IP المهاجم:</strong> ${ip}</p>
                <p><strong>عدد المحاولات:</strong> ${failedAttempts}</p>
                <p><strong>الإجراء:</strong> تم حظر الحساب لمدة أسبوع</p>
                <p><strong>الوقت:</strong> ${new Date().toLocaleString("ar-YE")}</p>
                <hr style="border-color: rgba(255,49,49,0.3);" />
                <p style="color: #8b949e; font-size: 0.85rem;">سحابة الأمن السيبراني - جامعة ذمار</p>
              </div>
            `,
          });
        } catch (emailError) {
          console.error("Failed to send security alert email:", emailError);
        }
      }

      // رسالة مخصصة حسب المرحلة
      let errorMessage = "البيانات المدخلة غير صحيحة";
      if (shouldLock) {
        if (isBreachAttempt) {
          errorMessage = "تم حظر الحساب لمدة أسبوع بسبب محاولات اختراق متكررة";
        } else if (previousLocks >= 1) {
          errorMessage = `تم حظر الحساب لمدة ${lockDurationMinutes} دقيقة. حاول مرة أخرى لاحقاً.`;
        } else {
          errorMessage = `تم حظر الحساب لمدة ${lockDurationMinutes} دقائق. حاول مرة أخرى لاحقاً.`;
        }
      }

      return NextResponse.json(
        { success: false, message: errorMessage },
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

    // التحقق من 2FA
    if (user.twoFactorEnabled) {
      const { twoFactorToken } = body;
      if (!twoFactorToken) {
        return NextResponse.json(
          {
            success: false,
            requires2FA: true,
            message: "يرجى إدخال كود المصادقة الثنائية",
          },
          { status: 200 },
        );
      }

      const { verifyTwoFACode } = await import("@/lib/twofa");
      let twoFAValid = false;

      try {
        const stored = JSON.parse(user.twoFactorSecret || "{}");
        twoFAValid = verifyTwoFACode(stored.secret, twoFactorToken);

        if (!twoFAValid && stored.backupCodes) {
          const idx = stored.backupCodes.indexOf(twoFactorToken);
          if (idx !== -1) {
            twoFAValid = true;
            stored.backupCodes.splice(idx, 1);
            await prisma.user.update({
              where: { id: user.id },
              data: { twoFactorSecret: JSON.stringify(stored) },
            });
          }
        }
      } catch {
        twoFAValid = false;
      }

      if (!twoFAValid) {
        return NextResponse.json(
          { success: false, message: "كود المصادقة غير صحيح" },
          { status: 401 },
        );
      }
    }

    // توليد التوكنات
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      level: user.level || undefined,
      managementLevel: user.managementLevel || undefined,
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
      token: accessToken,
      role: user.role,
      level: user.level,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        level: user.level,
        webAuthnEnabled: user.webAuthnEnabled,
        managementLevel: user.managementLevel,
      },
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}

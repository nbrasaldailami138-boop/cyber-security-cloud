import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { verifyTwoFACode } from "@/lib/twofa";
import { twoFARateLimiter } from "@/lib/ratelimit";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success: rateLimitOk } = await twoFARateLimiter.limit(ip);
    if (!rateLimitOk) {
      return NextResponse.json({ success: false, message: "محاولات كثيرة. حاول لاحقاً." }, { status: 429 });
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken) {
      return NextResponse.json({ success: false, message: "غير مصرح" }, { status: 401 });
    }

    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET);
    const userId = payload.sub as string;

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ success: false, message: "الكود مطلوب" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      return NextResponse.json({ success: false, message: "لم يتم بدء الإعداد" }, { status: 400 });
    }

    const { secret, backupCodes } = JSON.parse(user.twoFactorSecret);

    // التحقق من الكود أو رمز الاسترجاع
    let isValid = verifyTwoFACode(secret, token);

    if (!isValid && backupCodes) {
      const idx = backupCodes.indexOf(token);
      if (idx !== -1) {
        isValid = true;
        backupCodes.splice(idx, 1);
      }
    }

    if (!isValid) {
      return NextResponse.json({ success: false, message: "الكود غير صحيح" }, { status: 400 });
    }

    // تفعيل 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: JSON.stringify({ secret, backupCodes }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تفعيل المصادقة الثنائية",
      backupCodes,
    });
  } catch {
    return NextResponse.json({ success: false, message: "حدث خطأ" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { generateTwoFASecret, generateQRCode } from "@/lib/twofa";
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
    const userEmail = payload.email as string;

    const secret = generateTwoFASecret(userEmail);
    const qrCode = await generateQRCode(secret.otpauthUrl);
    const backupCodes = Array.from({ length: 8 }, () =>
      Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join(""),
    );

    // حفظ السري مؤقتاً لحين التحقق
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: JSON.stringify({ secret: secret.base32, backupCodes }) },
    });

    return NextResponse.json({
      success: true,
      data: { secret: secret.base32, qrCode, backupCodes },
    });
  } catch {
    return NextResponse.json({ success: false, message: "حدث خطأ" }, { status: 500 });
  }
}

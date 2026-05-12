import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { JWTPayload } from "@/lib/types";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET!,
);

// توليد Access Token
export async function generateAccessToken(
  payload: Omit<JWTPayload, "type" | "iat" | "exp">,
): Promise<string> {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(process.env.JWT_ACCESS_EXPIRES_IN || "15m")
    .setIssuedAt()
    .sign(ACCESS_SECRET);
}

// توليد Refresh Token
export async function generateRefreshToken(userId: string): Promise<string> {
  const token = await new SignJWT({ sub: userId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRES_IN || "7d")
    .setIssuedAt()
    .sign(REFRESH_SECRET);

  // تخزين في قاعدة البيانات
  await prisma.session.create({
    data: {
      userId,
      refreshToken: token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return token;
}

// التحقق من Access Token
export async function verifyAccessToken(
  token: string,
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// التحقق من Refresh Token
export async function verifyRefreshToken(
  token: string,
): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);

    // التحقق من وجود الجلسة في قاعدة البيانات
    const session = await prisma.session.findUnique({
      where: { refreshToken: token },
    });

    if (!session || session.revokedAt) return null;

    return { sub: payload.sub as string };
  } catch {
    return null;
  }
}

// حذف جلسة (تسجيل خروج)
export async function revokeSession(token: string): Promise<void> {
  await prisma.session.updateMany({
    where: { refreshToken: token },
    data: { revokedAt: new Date() },
  });
}

// حذف جميع جلسات المستخدم
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// تعيين الكوكيز
export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60, // 15 دقيقة
    path: "/",
  });

  cookieStore.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60, // 7 أيام
    path: "/",
  });
}

// مسح الكوكيز
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set("accessToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  cookieStore.set("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
}

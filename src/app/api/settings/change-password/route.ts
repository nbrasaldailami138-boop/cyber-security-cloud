import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import argon2 from "argon2";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken)
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 },
      );

    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET);
    const userId = payload.sub as string;

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "البيانات المدخلة غير كاملة" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "كلمة المرور الجديدة قصيرة جداً" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    const isCurrentValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isCurrentValid) {
      return NextResponse.json(
        { success: false, message: "كلمة المرور الحالية غير صحيحة" },
        { status: 400 },
      );
    }

    const newHash = await argon2.hash(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (refreshToken) {
      const currentSession = await prisma.session.findUnique({
        where: { refreshToken },
      });

      if (currentSession) {
        await prisma.session.updateMany({
          where: { userId, id: { not: currentSession.id }, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

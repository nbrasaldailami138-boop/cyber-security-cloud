import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

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

    const { newEmail } = await request.json();

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json(
        { success: false, message: "البريد الإلكتروني غير صالح" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "البريد الإلكتروني مستخدم بالفعل" },
        { status: 400 },
      );
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: "UPDATE",
        severity: "INFO",
        description: `طلب تغيير البريد الإلكتروني إلى: ${newEmail}`,
        metadata: { newEmail },
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "ACCOUNT_MODIFIED",
          title: "طلب تغيير بريد إلكتروني",
          body: `المستخدم ${payload.email} يطلب تغيير بريده إلى: ${newEmail}`,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم إرسال طلب تغيير البريد الإلكتروني",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

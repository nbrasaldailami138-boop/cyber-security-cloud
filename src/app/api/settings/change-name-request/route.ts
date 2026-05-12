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

    const { newName } = await request.json();

    if (!newName || newName.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: "الاسم الجديد غير صالح" },
        { status: 400 },
      );
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: "UPDATE",
        severity: "INFO",
        description: `طلب تغيير الاسم إلى: ${newName.trim()}`,
        metadata: { newName: newName.trim() },
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
          title: "طلب تغيير اسم",
          body: `المستخدم ${payload.email} يطلب تغيير اسمه إلى: ${newName.trim()}`,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم إرسال طلب تغيير الاسم",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

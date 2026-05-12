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

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });
    if (!user)
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 },
      );

    if (!["ADMIN", "MANAGEMENT", "TEACHER"].includes(user.role))
      return NextResponse.json(
        { success: false, message: "ليس لديك صلاحية النشر" },
        { status: 403 },
      );

    const { title, description, level } = await request.json();

    if (!title || !description) {
      return NextResponse.json(
        { success: false, message: "العنوان والوصف مطلوبان" },
        { status: 400 },
      );
    }

    const targetLevel =
      user.role === "ADMIN" ? level || user.level : user.level;

    if (!targetLevel) {
      return NextResponse.json(
        { success: false, message: "المستوى غير محدد" },
        { status: 400 },
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        level: targetLevel,
        publisherId: userId,
      },
    });

    const usersInLevel = await prisma.user.findMany({
      where: { level: targetLevel, deletedAt: null },
      select: { id: true },
    });

    if (usersInLevel.length > 0) {
      await prisma.notification.createMany({
        data: usersInLevel.map((u) => ({
          userId: u.id,
          type: "NEW_ANNOUNCEMENT",
          title: "تعميم جديد",
          body: title.trim(),
          linkUrl: `/announcements/${announcement.id}`,
        })),
      });
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: "PUBLISH",
        severity: "INFO",
        description: `نشر تعميم: ${title.trim()}`,
        level: targetLevel,
        metadata: { announcementId: announcement.id },
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم نشر التعميم بنجاح",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

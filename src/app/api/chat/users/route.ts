import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 },
      );
    }

    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET);
    const userId = payload.sub as string;
    const userRole = payload.role as string;
    const userLevel = payload.level as string | undefined;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    // تحديد من يمكنه المراسلة حسب العزل الأكاديمي
    const where: any = {
      id: { not: userId },
      deletedAt: null,
      status: "ACTIVE",
    };

    if (search) {
      where.name = { contains: search };
    }

    // طالب: يرى معلمي مستواه + إدارة مستواه + الأدمن
    if (userRole === "STUDENT") {
      where.OR = [
        { role: "ADMIN" },
        { role: "MANAGEMENT", level: userLevel },
        { role: "TEACHER", level: userLevel },
      ];
    }
    // معلم: يرى طلاب مستواه + إدارة مستواه + الأدمن
    else if (userRole === "TEACHER") {
      where.OR = [
        { role: "ADMIN" },
        { role: "MANAGEMENT", level: userLevel },
        { role: "STUDENT", level: userLevel },
      ];
    }
    // إدارة: يرى معلمين وطلاب مستواها + الأدمن
    else if (userRole === "MANAGEMENT") {
      where.OR = [
        { role: "ADMIN" },
        { role: "TEACHER", level: userLevel },
        { role: "STUDENT", level: userLevel },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, role: true, level: true },
      take: 20,
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error("Search Users Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

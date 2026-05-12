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
    if (payload.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );
    }

    const { level, semester } = await request.json();

    if (!level || !semester) {
      return NextResponse.json(
        { success: false, message: "البيانات المدخلة غير كاملة" },
        { status: 400 },
      );
    }

    if (!["LEVEL_1", "LEVEL_2"].includes(level)) {
      return NextResponse.json(
        { success: false, message: "المستوى غير صالح" },
        { status: 400 },
      );
    }

    if (!["TERM_1", "TERM_2"].includes(semester)) {
      return NextResponse.json(
        { success: false, message: "الترم غير صالح" },
        { status: 400 },
      );
    }

    await prisma.subject.updateMany({
      where: { level: level as any },
      data: { isActive: false },
    });

    await prisma.systemConfig.upsert({
      where: { key: `current_semester_${level}` },
      update: { value: semester },
      create: { key: `current_semester_${level}`, value: semester },
    });

    await prisma.auditLog.create({
      data: {
        userId: payload.sub as string,
        action: "SEMESTER_SWITCH",
        severity: "INFO",
        description: `تم تبديل الترم للمستوى ${level} إلى ${semester}`,
        level: level as any,
        metadata: { level, semester },
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تبديل الترم بنجاح",
      data: { level, semester },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

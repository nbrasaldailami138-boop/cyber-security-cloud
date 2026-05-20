import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken)
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 },
      );

    await jwtVerify(accessToken, ACCESS_SECRET);

    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");

    if (!level) {
      return NextResponse.json(
        { success: false, message: "المستوى مطلوب" },
        { status: 400 },
      );
    }

    const config = await prisma.systemConfig.findUnique({
      where: { key: `current_semester_${level}` },
    });

    return NextResponse.json({
      success: true,
      data: { semester: config?.value || "TERM_1" },
    });
  } catch (error) {
    console.error("Promotion config error:", error);
    return NextResponse.json({ success: false, message: "حدث خطأ" }, { status: 500 });
  }
}

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
    if (payload.role !== "ADMIN" && payload.role !== "MANAGEMENT") {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );
    }

    const { studentIds, fromLevel, toLevel } = await request.json();

    if (!studentIds?.length || !fromLevel || !toLevel) {
      return NextResponse.json(
        { success: false, message: "البيانات المدخلة غير كاملة" },
        { status: 400 },
      );
    }

    if (!["LEVEL_1", "LEVEL_2"].includes(fromLevel) || !["LEVEL_1", "LEVEL_2"].includes(toLevel)) {
      return NextResponse.json(
        { success: false, message: "المستوى غير صالح" },
        { status: 400 },
      );
    }

    // عزل الإدارة: لا يمكن إنشاء طلبات ترقية لمستوى آخر
    const userLevel = payload.level as string | undefined;
    if (payload.role === "MANAGEMENT" && userLevel && fromLevel !== userLevel) {
      return NextResponse.json(
        { success: false, message: "لا يمكنك إنشاء طلبات ترقية لمستوى آخر" },
        { status: 403 },
      );
    }

    const students = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        role: "STUDENT",
        level: fromLevel as any,
        deletedAt: null,
      },
    });

    if (students.length !== studentIds.length) {
      return NextResponse.json(
        { success: false, message: "بعض الطلاب غير موجودين أو غير صالحين للترقية" },
        { status: 400 },
      );
    }

    await prisma.promotionRequest.createMany({
      data: students.map((s) => ({
        userId: s.id,
        fromLevel: fromLevel as any,
        toLevel: toLevel as any,
      })),
    });

    return NextResponse.json({
      success: true,
      message: "تم إرسال طلبات الترقية",
      count: students.length,
    });
  } catch (error) {
    console.error("Promotion request error:", error);
    return NextResponse.json({ success: false, message: "حدث خطأ" }, { status: 500 });
  }
}

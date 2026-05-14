import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export async function DELETE(request: NextRequest) {
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

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "معرف التكليف مطلوب" },
        { status: 400 },
      );
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment || assignment.deletedAt) {
      return NextResponse.json(
        { success: false, message: "التكليف غير موجود" },
        { status: 404 },
      );
    }

    // الطالب يحذف تكليفه فقط، الأدمن يحذف أي تكليف
    if (userRole !== "ADMIN" && assignment.studentId !== userId) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بحذف هذا التكليف" },
        { status: 403 },
      );
    }

    // Soft Delete
    await prisma.assignment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "تم حذف التكليف بنجاح",
    });
  } catch (error: any) {
    console.error("Delete Assignment Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء حذف التكليف" },
      { status: 500 },
    );
  }
}

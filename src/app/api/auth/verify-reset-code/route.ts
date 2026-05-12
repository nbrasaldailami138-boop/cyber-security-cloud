import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/security";
import { z } from "zod";

const verifySchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  code: z.string().min(6, "كود التحقق غير صحيح"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = verifySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, code } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "بريد إلكتروني غير موجود" },
        { status: 404 },
      );
    }

    // التحقق من الكود
    const codeHash = hashToken(code);
    if (
      user.activationCodeHash !== codeHash ||
      !user.activationExpires ||
      new Date() > user.activationExpires
    ) {
      return NextResponse.json(
        { success: false, message: "كود التحقق غير صحيح أو منتهي الصلاحية" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      status: "success",
      message: "الكود صحيح. يمكنك الآن تعيين كلمة مرور جديدة.",
    });
  } catch (error: any) {
    console.error("Verify Reset Code Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}

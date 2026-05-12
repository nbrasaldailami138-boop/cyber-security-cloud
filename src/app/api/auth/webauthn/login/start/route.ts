import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOpts } from "@/lib/webauthn";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "البريد مطلوب" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user || !user.webAuthnEnabled) {
      return NextResponse.json(
        { success: false, message: "البصمة غير مفعلة لهذا الحساب" },
        { status: 400 },
      );
    }

    const options = await generateAuthenticationOpts(user.id);

    return NextResponse.json({ success: true, options, userId: user.id });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyRegistration } from "@/lib/webauthn";
import { jwtVerify } from "jose";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const result = await verifyRegistration(userId, body);

    return NextResponse.json({
      success: true,
      message: "تم تسجيل البصمة بنجاح",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

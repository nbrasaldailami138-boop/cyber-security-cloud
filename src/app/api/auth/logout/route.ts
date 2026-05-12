import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeSession, clearAuthCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (refreshToken) {
      await revokeSession(refreshToken);
    }

    await clearAuthCookies();

    return NextResponse.json({
      success: true,
      message: "تم تسجيل الخروج بنجاح",
    });
  } catch (error: any) {
    console.error("Logout Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { generateRegistrationOpts } from "@/lib/webauthn";
import { prisma } from "@/lib/prisma";

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
    const userEmail = payload.email as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const options = await generateRegistrationOpts(
      userId,
      userEmail,
      user?.name || userEmail,
    );

    return NextResponse.json({ success: true, options });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

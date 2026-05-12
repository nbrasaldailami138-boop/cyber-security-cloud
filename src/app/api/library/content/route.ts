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
    const userLevel = payload.level as string | undefined;
    const userRole = payload.role as string;

    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level") || userLevel;
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const where: any = { deletedAt: null };

    // عزل أكاديمي
    if (userRole === "ADMIN" && level) {
      where.level = level;
    } else if (userRole !== "ADMIN") {
      where.level = userLevel;
    }

    if (type) where.type = type;
    if (search) {
      where.title = { contains: search };
    }

    const content = await prisma.content.findMany({
      where,
      include: {
        publisher: { select: { name: true, role: true } },
        subject: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, data: content });
  } catch (error: any) {
    console.error("Library Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

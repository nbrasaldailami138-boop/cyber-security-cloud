import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export const dynamic = "force-dynamic";

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
    const userRole = payload.role as string;
    const userLevel = payload.level as string | undefined;

    if (userRole !== "ADMIN" && userRole !== "MANAGEMENT") {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );
    }

    const userFilter =
      userRole === "MANAGEMENT" && userLevel ? { level: userLevel as any } : {};

    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      totalAssignments,
      evaluatedAssignments,
      totalContent,
      totalSubjects,
    ] = await Promise.all([
      prisma.user.count({ where: { ...userFilter, deletedAt: null } }),
      prisma.user.count({
        where: { ...userFilter, status: "ACTIVE", deletedAt: null },
      }),
      prisma.user.count({
        where: { ...userFilter, status: "PENDING", deletedAt: null },
      }),
      prisma.assignment.count({ where: { deletedAt: null } }),
      prisma.assignment.count({
        where: { grade: { not: null }, deletedAt: null },
      }),
      prisma.content.count({ where: { deletedAt: null } }),
      prisma.subject.count({ where: { ...userFilter, deletedAt: null } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        pendingUsers,
        totalAssignments,
        evaluatedAssignments,
        totalContent,
        totalSubjects,
      },
    });
  } catch (error: any) {
    console.error("Server Stats Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

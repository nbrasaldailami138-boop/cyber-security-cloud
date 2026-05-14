import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

// ==================== POST: منح صلاحية النشر أو ترقية لإدارة ====================
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
    const granterRole = payload.role as string;
    const granterLevel = payload.level as string;
    const granterId = payload.sub as string;

    if (granterRole !== "ADMIN" && granterRole !== "MANAGEMENT") {
      return NextResponse.json(
        { success: false, message: "غير مصرح بهذه العملية" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { userId, email, managementLevel } = body;

    // البحث عن المستخدم
    let user;
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId, deletedAt: null },
      });
    } else if (email) {
      user = await prisma.user.findUnique({
        where: { email, deletedAt: null },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    // التحقق من العزل الأكاديمي للإدارة
    if (granterRole === "MANAGEMENT" && user.level !== granterLevel) {
      return NextResponse.json(
        { success: false, message: "لا يمكنك ترقية مستخدم من مستوى آخر" },
        { status: 403 },
      );
    }

    // ترقية إلى إدارة
    if (managementLevel) {
      if (user.managementLevel) {
        return NextResponse.json(
          { success: false, message: "المستخدم لديه رتبة إدارة بالفعل" },
          { status: 400 },
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { managementLevel: managementLevel as any },
      });

      await prisma.auditLog.create({
        data: {
          userId: granterId,
          action: "CREATE",
          severity: "INFO",
          description: `ترقية ${user.name} إلى رتبة إدارة ${managementLevel}`,
          ipAddress: request.headers.get("x-forwarded-for") || undefined,
          level: managementLevel as any,
          metadata: {
            targetUserId: user.id,
            targetUserName: user.name,
            targetUserRole: user.role,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `⭐ تم ترقية ${user.name} إلى إدارة بنجاح`,
      });
    }

    // منح صلاحية النشر
    const existingPermission = await prisma.uploadPermission.findFirst({
      where: { userId: user.id, revokedAt: null },
    });

    if (existingPermission) {
      // إعادة تعيين الصلاحية القديمة تلقائياً
      await prisma.uploadPermission.update({
        where: { id: existingPermission.id },
        data: { revokedAt: new Date() },
      });
    }

    const permission = await prisma.uploadPermission.create({
      data: { userId: user.id, grantedBy: granterId },
    });

    await prisma.auditLog.create({
      data: {
        userId: granterId,
        action: "CREATE",
        severity: "INFO",
        description: `منح ${user.name} صلاحية النشر في المكتبة`,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        level: user.level as any,
        metadata: {
          targetUserId: user.id,
          targetUserName: user.name,
          targetUserRole: user.role,
          permissionId: permission.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `تم ترقية ${user.name} بنجاح 🎉`,
      data: permission,
    });
  } catch (error: any) {
    console.error("Upgrade POST Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في الخادم" },
      { status: 500 },
    );
  }
}

// ==================== DELETE: سحب صلاحية النشر أو رتبة إدارة ====================
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
    const granterRole = payload.role as string;
    const granterId = payload.sub as string;

    if (granterRole !== "ADMIN" && granterRole !== "MANAGEMENT") {
      return NextResponse.json(
        { success: false, message: "غير مصرح بهذه العملية" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { permissionId, userId, action } = body;

    // سحب رتبة إدارة
    if (action === "revoke-management" && userId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!targetUser) {
        return NextResponse.json(
          { success: false, message: "المستخدم غير موجود" },
          { status: 404 },
        );
      }

      await prisma.user.update({
        where: { id: userId },
        data: { managementLevel: null },
      });

      await prisma.auditLog.create({
        data: {
          userId: granterId,
          action: "DELETE",
          severity: "WARNING",
          description: `سحب رتبة الإدارة من ${targetUser.name}`,
          ipAddress: request.headers.get("x-forwarded-for") || undefined,
          metadata: { targetUserId: userId, targetUserName: targetUser.name },
        },
      });

      return NextResponse.json({
        success: true,
        message: `تم سحب رتبة الإدارة من ${targetUser.name}`,
      });
    }

    if (!permissionId) {
      return NextResponse.json(
        { success: false, message: "معرف الصلاحية مطلوب" },
        { status: 400 },
      );
    }

    const permission = await prisma.uploadPermission.findUnique({
      where: { id: permissionId },
      include: { user: { select: { name: true, level: true, role: true } } },
    });

    if (!permission || permission.revokedAt) {
      return NextResponse.json(
        { success: false, message: "الصلاحية غير موجودة أو ملغاة بالفعل" },
        { status: 404 },
      );
    }

    // سحب الصلاحية
    await prisma.uploadPermission.update({
      where: { id: permissionId },
      data: { revokedAt: new Date() },
    });

    // تسجيل في سجل العمليات
    await prisma.auditLog.create({
      data: {
        userId: granterId,
        action: "DELETE",
        severity: "WARNING",
        description: `سحب صلاحية النشر من ${permission.user.name}`,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        level: permission.user.level as any,
        metadata: {
          targetUserId: permission.userId,
          targetUserName: permission.user.name,
          targetUserRole: permission.user.role,
          permissionId: permission.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `تم سحب صلاحية النشر من ${permission.user.name}`,
    });
  } catch (error: any) {
    console.error("Upgrade DELETE Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في الخادم" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/security";
import { z } from "zod";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken) {
      return NextResponse.json({ success: false, message: "غير مصرح" }, { status: 401 });
    }

    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET);
    if (payload.role !== "ADMIN" && payload.role !== "MANAGEMENT") {
      return NextResponse.json({ success: false, message: "غير مصرح" }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;
    if (!name || name.length < 2) {
      return NextResponse.json({ success: false, message: "الاسم قصير جداً" }, { status: 400 });
    }

    const entry = await prisma.generationLog.findUnique({ where: { id: params.id } });
    if (!entry || entry.deletedAt) {
      return NextResponse.json({ success: false, message: "السجل غير موجود" }, { status: 404 });
    }

    // MANAGEMENT can only edit their own level
    if (payload.role === "MANAGEMENT" && payload.level !== entry.level) {
      return NextResponse.json({ success: false, message: "لا يمكنك تعديل سجل من مستوى آخر" }, { status: 403 });
    }

    await prisma.generationLog.update({
      where: { id: params.id },
      data: { name },
    });

    return NextResponse.json({ success: true, message: "تم تعديل الاسم بنجاح" });
  } catch (error: any) {
    console.error("Update Generation Log Error:", error);
    return NextResponse.json({ success: false, message: "حدث خطأ في السيرفر" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken) {
      return NextResponse.json({ success: false, message: "غير مصرح" }, { status: 401 });
    }

    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET);
    if (payload.role !== "ADMIN" && payload.role !== "MANAGEMENT") {
      return NextResponse.json({ success: false, message: "غير مصرح" }, { status: 403 });
    }

    const entry = await prisma.generationLog.findUnique({ where: { id: params.id } });
    if (!entry || entry.deletedAt) {
      return NextResponse.json({ success: false, message: "السجل غير موجود" }, { status: 404 });
    }

    if (payload.role === "MANAGEMENT" && payload.level !== entry.level) {
      return NextResponse.json({ success: false, message: "لا يمكنك حذف سجل من مستوى آخر" }, { status: 403 });
    }

    // حذف المستخدم المرتبط بالسجل إن وجد
    if (entry.email) {
      const user = await prisma.user.findUnique({ where: { email: entry.email } });
      if (user && !user.deletedAt) {
        // إذا كان المستخدم معلماً، حذف المواد المرتبطة به أولاً
        if (user.role === "TEACHER") {
          await prisma.subject.updateMany({
            where: { teacherId: user.id, deletedAt: null },
            data: { deletedAt: new Date(), teacherId: null },
          });
        }
        // حذف المستخدم (soft delete)
        await prisma.user.update({
          where: { id: user.id },
          data: { deletedAt: new Date(), status: "SUSPENDED", passwordHash: "" },
        });
      }
    }

    // حذف كود التفعيل المرتبط
    if (entry.code) {
      const codeHashValue = hashToken(entry.code);
      await prisma.activationCode.updateMany({
        where: { codeHash: codeHashValue, usedAt: null },
        data: { expiresAt: new Date(0) },
      }).catch(() => {});
    }

    // Soft delete سجل التوليد
    await prisma.generationLog.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: payload.sub as string,
        action: "DELETE",
        description: `تم حذف الحساب المولد: ${entry.name} - ${entry.role}`,
        level: entry.level as any,
      },
    });

    return NextResponse.json({ success: true, message: "تم حذف السجل والمستخدم المرتبط به بنجاح" });
  } catch (error: any) {
    console.error("Delete Generation Log Error:", error);
    return NextResponse.json({ success: false, message: "حدث خطأ في السيرفر" }, { status: 500 });
  }
}

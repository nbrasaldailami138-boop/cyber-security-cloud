import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 },
      );
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 },
      );
    }

    const { id, type } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف الملف مطلوب" },
        { status: 400 },
      );
    }

    // حذف من الملفات المشتركة
    if (type === "shared" || !type) {
      const effectiveRole = payload.managementLevel
        ? "MANAGEMENT"
        : payload.role;
      if (effectiveRole !== "ADMIN" && effectiveRole !== "MANAGEMENT") {
        return NextResponse.json(
          { success: false, error: "غير مصرح" },
          { status: 403 },
        );
      }

      const existingShares = await prisma.systemConfig.findFirst({
        where: { key: "code_editor_shares" },
      });

      if (existingShares) {
        let shares = JSON.parse(existingShares.value);
        shares = shares.filter((s: any) => s.id !== id);
        await prisma.systemConfig.update({
          where: { key: "code_editor_shares" },
          data: { value: JSON.stringify(shares) },
        });
      }
    }

    // حذف من ملفاتي (ImageKit) - نحتاج API منفصل أو نحذف من السيرفر
    if (type === "myfile") {
      const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
      const auth = Buffer.from(`${privateKey}:`).toString("base64");

      await fetch(`https://api.imagekit.io/v1/files/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Basic ${auth}` },
      });
    }

    return NextResponse.json({ success: true, message: "تم الحذف بنجاح" });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في الحذف" },
      { status: 500 },
    );
  }
}

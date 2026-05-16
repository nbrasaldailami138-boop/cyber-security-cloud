import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
const IMAGEKIT_URL = "https://api.imagekit.io/v1";
const IMAGEKIT_KEY = Buffer.from(
  `${process.env.IMAGEKIT_PRIVATE_KEY}:`,
).toString("base64");

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken)
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 },
      );

    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET);
    if (
      payload.role !== "ADMIN" &&
      payload.role !== "MANAGEMENT" &&
      !payload.managementLevel
    ) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    if (!path)
      return NextResponse.json(
        { success: false, message: "المسار مطلوب" },
        { status: 400 },
      );

    const res = await fetch(
      `${IMAGEKIT_URL}/files?path=${encodeURIComponent(path)}&limit=100`,
      {
        headers: { Authorization: `Basic ${IMAGEKIT_KEY}` },
      },
    );
    const files = await res.json();

    const data = (Array.isArray(files) ? files : []).map((f: any) => ({
      fileId: f.fileId,
      name: f.name,
      url: f.url,
      size: f.size,
      updatedAt: f.updatedAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken)
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 },
      );

    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET);
    if (
      payload.role !== "ADMIN" &&
      payload.role !== "MANAGEMENT" &&
      !payload.managementLevel
    ) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );
    }

    const { fileId } = await request.json();
    if (!fileId)
      return NextResponse.json(
        { success: false, message: "معرف الملف مطلوب" },
        { status: 400 },
      );

    const res = await fetch(`${IMAGEKIT_URL}/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${IMAGEKIT_KEY}` },
    });

    if (res.ok)
      return NextResponse.json({ success: true, message: "تم حذف الملف" });
    return NextResponse.json(
      { success: false, message: "فشل الحذف" },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

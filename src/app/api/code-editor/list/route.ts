import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";
import { imagekit } from "@/lib/imagekit";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level") || payload.level || "LEVEL_1";

    // العزل الأكاديمي: المستخدم يرى ملفاته فقط
    const folder = `/code-editor/${level}/${payload.sub}`;

    const files = await imagekit.listFiles({
      path: folder,
      skip: 0,
      limit: 100,
    });

    const data = files.map((f: any) => ({
      fileId: f.fileId,
      fileName: f.name,
      fileUrl: f.url,
      fileSize: f.size,
      createdAt: f.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Code list error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في جلب الملفات" },
      { status: 500 },
    );
  }
}

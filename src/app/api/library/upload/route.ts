import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { imagekit } from "@/lib/imagekit";
import { APP_CONFIG } from "@/config";

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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const subjectId = formData.get("subjectId") as string;
    const type = (formData.get("type") as string) || "PDF";

    if (!file || !title) {
      return NextResponse.json(
        { success: false, message: "الملف والعنوان مطلوبان" },
        { status: 400 },
      );
    }

    // التحقق من الحجم
    if (file.size > APP_CONFIG.maxFileSize) {
      return NextResponse.json(
        { success: false, message: "حجم الملف كبير جداً (الحد 20MB)" },
        { status: 400 },
      );
    }

    // التحقق من النوع
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (APP_CONFIG.blockedFileExtensions.includes(`.${ext}`)) {
      return NextResponse.json(
        { success: false, message: "نوع الملف غير مسموح به" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    // رفع الملف إلى ImageKit
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResponse = await imagekit.upload({
      file: buffer.toString("base64"),
      fileName: `${Date.now()}-${file.name}`,
      folder: `/level-${user.level}/${type}`,
    });

    // حفظ في قاعدة البيانات
    const content = await prisma.content.create({
      data: {
        title,
        type: type as any,
        fileUrl: uploadResponse.url,
        fileSize: file.size,
        level: user.level!,
        publisherId: userId,
        subjectId: subjectId || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم رفع الملف بنجاح",
      data: content,
    });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

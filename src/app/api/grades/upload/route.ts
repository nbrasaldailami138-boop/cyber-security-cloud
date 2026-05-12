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
    const userRole = payload.role as string;

    if (userRole !== "TEACHER" && userRole !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const subjectId = formData.get("subjectId") as string;

    if (!file || !subjectId) {
      return NextResponse.json(
        { success: false, message: "الملف ومعرف المادة مطلوبان" },
        { status: 400 },
      );
    }

    if (file.size > APP_CONFIG.maxFileSize) {
      return NextResponse.json(
        { success: false, message: "حجم الملف كبير جداً (الحد 20MB)" },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (APP_CONFIG.blockedFileExtensions.includes(`.${ext}`)) {
      return NextResponse.json(
        { success: false, message: "نوع الملف غير مسموح به" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.level) {
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResponse = await imagekit.upload({
      file: buffer.toString("base64"),
      fileName: `${Date.now()}-${file.name}`,
      folder: `/level-${user.level}/grades`,
    });

    const gradeDistribution = await prisma.gradeDistribution.create({
      data: {
        teacherId: userId,
        subjectId,
        fileUrl: uploadResponse.url,
        fileName: file.name,
        level: user.level,
        studentsCount: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم رفع توزيع الدرجات بنجاح",
      data: {
        id: gradeDistribution.id,
        fileUrl: gradeDistribution.fileUrl,
        fileName: gradeDistribution.fileName,
      },
    });
  } catch (error: any) {
    console.error("Grade Upload Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء رفع الملف" },
      { status: 500 },
    );
  }
}

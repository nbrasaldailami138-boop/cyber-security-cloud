import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { imagekit } from "@/lib/imagekit";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

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
    const userRole = payload.role as string;
    const managementLevel = payload.managementLevel as string | undefined;
    const userLevel = payload.level as string;

    const isAdmin = userRole === "ADMIN";
    const isManager = userRole === "MANAGEMENT" || !!managementLevel;
    if (!isAdmin && !isManager) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );
    }
    const effectiveLevel = isAdmin ? null : managementLevel || userLevel;

    const allFiles = await imagekit.listFiles({ limit: 500 });

    const result: Record<string, any> = {};

    for (const file of allFiles) {
      const filePath = file.filePath || "/";
      const pathParts = filePath.split("/").filter((p) => p);

      let level = "غير مصنف";
      for (const part of pathParts) {
        if (part.match(/level-\d/i)) {
          level = part.toUpperCase().replace("-", "_");
          break;
        }
        if (part.match(/level-LEVEL_\d/i)) {
          level = part.replace("level-", "").toUpperCase();
          break;
        }
      }

      let subFolder = "ملفات أخرى";
      if (filePath.includes("/library/")) {
        const parts = filePath.split("/library/");
        if (parts.length > 1) {
          const subParts = parts[1].split("/");
          subFolder = "📚 " + (subParts[0] || "مكتبة");
        } else {
          subFolder = "📚 المكتبة التعليمية";
        }
      } else if (filePath.includes("/assignments/")) {
        const parts = filePath.split("/assignments/");
        if (parts.length > 1) {
          const subParts = parts[1].split("/");
          subFolder = "📤 " + (subParts[0] || "تكاليف");
        } else {
          subFolder = "📤 التكاليف";
        }
      } else if (filePath.includes("/grades/")) {
        const parts = filePath.split("/grades/");
        if (parts.length > 1) {
          const subParts = parts[1].split("/");
          subFolder = "📊 " + (subParts[0] || "درجات");
        } else {
          subFolder = "📊 توزيع الدرجات";
        }
      }

      if (effectiveLevel && level !== effectiveLevel && level !== "غير مصنف")
        continue;

      if (!result[level]) result[level] = {};
      if (!result[level][subFolder])
        result[level][subFolder] = { files: [], totalFiles: 0 };

      // استخراج اسم المستخدم من اسم الملف (عادة يحتوي على userId)
      let uploadedBy = "غير معروف";
      let targetUser = "غير معروف";

      // محاولة استخراج userId من اسم المجلد
      for (const part of pathParts) {
        if (part.match(/^[a-f0-9-]{36}$/i)) {
          targetUser = part.slice(0, 8) + "...";
        }
      }

      // تحديد نوع الناشر بناءً على المجلد
      if (filePath.includes("/library/")) uploadedBy = "مستخدم";
      else if (filePath.includes("/assignments/")) uploadedBy = "طالب";
      else if (filePath.includes("/grades/")) uploadedBy = "معلم";

      result[level][subFolder].files.push({
        fileId: file.fileId,
        name: file.name,
        url: file.url,
        size: file.size || 0,
        updatedAt: file.updatedAt || file.createdAt,
        path: filePath,
        uploadedBy,
        targetUser,
      });
      result[level][subFolder].totalFiles++;
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Folders Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}

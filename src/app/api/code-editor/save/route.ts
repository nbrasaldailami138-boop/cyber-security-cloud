import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { language, code, fileName, level } = body;

    if (!language || !code || !level) {
      return NextResponse.json(
        { success: false, error: "البيانات غير مكتملة" },
        { status: 400 },
      );
    }

    // رفع الملف إلى ImageKit باستخدام API مباشر
    const ext =
      language === "python"
        ? ".py"
        : language === "cpp"
          ? ".cpp"
          : language === "csharp"
            ? ".cs"
            : language === "html"
              ? ".html"
              : ".txt";
    const finalFileName = fileName || `code_${Date.now()}${ext}`;
    const folder = `/code-editor/${level}/${payload.sub}`;

    const formData = new FormData();
    formData.append("file", code);
    formData.append("fileName", finalFileName);
    formData.append("folder", folder);
    formData.append("useUniqueFileName", "true");

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
    const auth = Buffer.from(`${privateKey}:`).toString("base64");

    const uploadResponse = await fetch(
      "https://upload.imagekit.io/api/v1/files/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
        },
        body: formData,
      },
    );

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      console.error("ImageKit upload error:", uploadData);
      return NextResponse.json(
        {
          success: false,
          error: uploadData.message || "فشل الرفع إلى السحابة",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        fileId: uploadData.fileId,
        fileUrl: uploadData.url,
        fileName: uploadData.name,
      },
    });
  } catch (error) {
    console.error("Code save error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في حفظ الملف" },
      { status: 500 },
    );
  }
}

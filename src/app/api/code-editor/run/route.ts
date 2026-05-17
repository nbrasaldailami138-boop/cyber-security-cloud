import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";

const JDOODLE_API = "https://api.jdoodle.com/v1/execute";

const LANG_CONFIG: Record<string, { language: string; versionIndex: string }> =
  {
    python: { language: "python3", versionIndex: "4" },
    cpp: { language: "cpp17", versionIndex: "0" },
    csharp: { language: "csharp", versionIndex: "4" },
  };

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

    const { language, code } = await request.json();

    if (!language || !code) {
      return NextResponse.json(
        { success: false, error: "اللغة والكود مطلوبان" },
        { status: 400 },
      );
    }

    const langConfig = LANG_CONFIG[language];

    if (!langConfig) {
      return NextResponse.json(
        { success: false, error: "لغة غير مدعومة" },
        { status: 400 },
      );
    }

    const clientId = process.env.JDOODLE_CLIENT_ID || "";
    const clientSecret = process.env.JDOODLE_CLIENT_SECRET || "";

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: "مفاتيح JDoodle غير موجودة" },
        { status: 500 },
      );
    }

    const res = await fetch(JDOODLE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        clientSecret,
        script: code,
        language: langConfig.language,
        versionIndex: langConfig.versionIndex,
      }),
    });

    const data = await res.json();

    let output = "";

    if (data.output) {
      output += data.output;
    }

    if (data.error) {
      output += `\n[خطأ]: ${data.error}`;
    }

    if (data.statusCode && data.statusCode !== 200) {
      output += `\n[حالة]: ${data.error || data.message || "خطأ غير معروف"}`;
    }

    if (!output.trim()) {
      output = "✅ تم التشغيل بدون مخرجات";
    }

    return NextResponse.json({ success: true, output });
  } catch (error) {
    console.error("Code run error:", error);
    return NextResponse.json({
      success: true,
      output: "⚠️ فشل الاتصال بخادم JDoodle. حاول مرة أخرى.",
    });
  }
}

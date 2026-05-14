import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const level = searchParams.get("level");
    const ids = searchParams.get("ids"); // comma-separated

    const where: any = { deletedAt: null };

    if (payload.role === "MANAGEMENT" && payload.level) {
      where.level = payload.level as string;
    } else if (level) {
      where.level = level;
    }

    if (role) where.role = role;
    if (ids) {
      const idArray = ids.split(",").filter(Boolean);
      where.id = { in: idArray };
    }

    const entries = await prisma.generationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Build text file content
    const lines: string[] = [];
    lines.push("==================================================================");
    lines.push("              سحابة الأمن السيبراني - جامعة ذمار");
    lines.push("                    أكواد التفعيل");
    lines.push("==================================================================");
    lines.push("");
    lines.push(`تاريخ التصدير: ${new Date().toLocaleDateString("ar-YE")}`);
    lines.push(`إجمالي الأكواد: ${entries.length}`);
    lines.push("");

    for (const entry of entries) {
      lines.push("------------------------------------------------------------------");
      const roleLabel = entry.role === "STUDENT" ? "طالب" : entry.role === "TEACHER" ? "معلم" : "إدارة";
      lines.push(`الاسم: ${entry.name}`);
      lines.push(`الدور: ${roleLabel}`);
      lines.push(`المستوى: ${entry.level === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني"}`);
      if (entry.subjectName) lines.push(`المادة: ${entry.subjectName}`);
      if (entry.subjectCode) lines.push(`كود المادة: ${entry.subjectCode}`);
      lines.push(`كود التفعيل: ${entry.code}`);
      lines.push("");
    }

    lines.push("==================================================================");
    lines.push("              Cybersecurity Cloud - Dhamar University");
    lines.push("==================================================================");

    const content = lines.join("\n");
    const filename = `activation-codes-${Date.now()}.txt`;

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export Codes Error:", error);
    return NextResponse.json({ success: false, message: "حدث خطأ في السيرفر" }, { status: 500 });
  }
}

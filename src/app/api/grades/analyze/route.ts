import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { imagekit } from "@/lib/imagekit";
import { APP_CONFIG } from "@/config";
import { scanAndReject } from "@/lib/clamav";
import * as XLSX from "xlsx";
import { triggerChannelEvent } from "@/lib/pusherService";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

// ==================== استخراج النص من Excel ====================
function extractTextFromExcel(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let text = "";
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    text += csv + "\n";
  }
  return text;
}

// ==================== دوال استخراج النص ====================
async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  // لـ Excel: استخدم xlsx
  const isExcel =
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel");
  if (isExcel) {
    return extractTextFromExcel(buffer);
  }

  // لـ PDF: استخدم pdf-parse أولاً
  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      const text = data.text || "";
      if (
        text.length < 100 ||
        text.includes("obj") ||
        text.includes("endstream")
      ) {
        throw new Error("Invalid PDF text");
      }
      return text;
    } catch {
      return "";
    }
  }

  // للصور: OCR
  if (mimeType.startsWith("image/")) {
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const {
        data: { text },
      } = await Tesseract.recognize(buffer, "ara+eng", { logger: () => {} });
      return text || "";
    } catch {
      return "";
    }
  }

  // للنصوص و CSV
  if (
    mimeType === "text/plain" ||
    mimeType === "text/csv" ||
    fileName.endsWith(".csv") ||
    fileName.endsWith(".txt")
  ) {
    return buffer.toString("utf-8");
  }

  return buffer.toString("utf-8");
}

// ==================== استخراج أسماء ودرجات ====================
function parseExtractedText(
  text: string,
): { name: string; grade: string; feedback: string }[] {
  const lines = text.split(/[\n\r]+/).filter((l) => l.trim());
  const results: { name: string; grade: string; feedback: string }[] = [];

  for (const line of lines) {
    if (line.length < 3) continue;
    if (
      line.includes("الاسم") ||
      line.includes("الدرجة") ||
      line.includes("Name") ||
      line.includes("الرقم")
    )
      continue;

    // تقسيم CSV
    const parts = line
      .split(/[,;\t|]+/)
      .map((p) => p.trim().replace(/^"(.*)"$/, "$1"))
      .filter((p) => p);

    if (parts.length >= 2) {
      let name = "";
      let grade = "";
      let feedback = "";

      for (const part of parts) {
        const num = parseFloat(part);
        if (!isNaN(num) && num >= 0 && num <= 100) {
          grade = String(num);
        } else if (/[\u0600-\u06FF]/.test(part) && part.length > name.length) {
          name = part;
        } else if (part.length > 2 && !/^\d+$/.test(part)) {
          if (!name) name = part;
          else feedback += part + " ";
        } else if (/^\d{1,3}$/.test(part) && !grade) {
          grade = part;
        } else {
          feedback += part + " ";
        }
      }

      if (name && grade) {
        results.push({
          name: name.trim(),
          grade: grade.trim(),
          feedback: feedback.trim(),
        });
      }
    }
  }

  return results;
}

// ==================== تطبيع الأسماء العربية ====================
function normalizeArabicName(name: string): string {
  return name
    .replace(/[اأإآ]/g, "ا")
    .replace(/[ىيئ]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ؤو]/g, "و")
    .replace(/\s+/g, " ")
    .trim();
}

// ==================== POST ====================
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
    const userLevel = payload.level as string;

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { role: true, level: true, managementLevel: true },
    });
    if (!user)
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 },
      );

    const hasAccess =
      user.role === "TEACHER" ||
      user.role === "ADMIN" ||
      !!user.managementLevel;
    if (!hasAccess)
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const subjectId = formData.get("subjectId") as string;

    if (!file || !subjectId) {
      return NextResponse.json(
        { success: false, message: "الملف والمادة مطلوبان" },
        { status: 400 },
      );
    }

    if (file.size > APP_CONFIG.maxFileSize) {
      return NextResponse.json(
        { success: false, message: "حجم الملف كبير جداً" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const infected = await scanAndReject(buffer, file.name, userId);
    if (infected)
      return NextResponse.json(
        { success: false, message: "الملف مصاب بفيروس!" },
        { status: 400 },
      );

    const uploadResponse = await imagekit.upload({
      file: buffer.toString("base64"),
      fileName: `${Date.now()}-${file.name}`,
      folder: `/level-${userLevel}/grades/${subjectId}`,
    });

    let extractedText = await extractTextFromFile(buffer, file.type, file.name);

    extractedText = extractedText
      .replace(/\u0000/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
      .trim();

    const parsedStudents = parseExtractedText(extractedText);

    const dbStudents = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        level: userLevel as any,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    const matched = parsedStudents.map((parsed) => {
      const normalizedParsed = normalizeArabicName(parsed.name);
      let bestMatch: (typeof dbStudents)[0] | null = null;
      let bestScore = 0;

      for (const db of dbStudents) {
        const normalizedDb = normalizeArabicName(db.name);
        if (normalizedDb === normalizedParsed) {
          bestMatch = db;
          bestScore = 100;
          break;
        }
        if (
          normalizedDb.includes(normalizedParsed) ||
          normalizedParsed.includes(normalizedDb)
        ) {
          const score =
            (Math.min(normalizedDb.length, normalizedParsed.length) /
              Math.max(normalizedDb.length, normalizedParsed.length)) *
            100;
          if (score > bestScore) {
            bestMatch = db;
            bestScore = score;
          }
        }
      }

      return {
        dbId: bestMatch?.id || "",
        dbName: bestMatch?.name || "—",
        extractedName: parsed.name,
        grade: parsed.grade,
        feedback: parsed.feedback,
        matched: bestScore >= 60,
      };
    });

    const cleanData = JSON.parse(
      JSON.stringify({ extracted: parsedStudents, matched })
        .replace(/\u0000/g, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ""),
    );

    const distribution = await prisma.gradeDistribution.create({
      data: {
        teacherId: userId,
        subjectId,
        fileUrl: uploadResponse.url,
        fileName: file.name,
        level: userLevel as any,
        studentsCount: matched.length,
        distributionData: cleanData,
      },
    });

    try {
      await triggerChannelEvent(`user-${userId}`, "notification", {
        type: "ANALYSIS_COMPLETED",
        title: "✅ اكتمل التحليل",
        body: `تم استخراج ${parsedStudents.length} طالب من ${file.name}`,
        linkUrl: "/teacher/grades/analysis",
      });
    } catch {
      /* صامت */
    }

    try {
      const { sendPushNotification } = await import("@/lib/pushNotifications");
      await sendPushNotification(
        userId,
        "✅ اكتمل التحليل",
        `تم استخراج ${parsedStudents.length} طالب`,
        "/teacher/grades/analysis",
      );
    } catch {
      /* صامت */
    }

    return NextResponse.json({
      success: true,
      message: `تم استخراج ${parsedStudents.length} طالب`,
      extracted: parsedStudents,
      matched,
      distributionId: distribution.id,
    });
  } catch (error: any) {
    console.error("Grade Analyze Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تحليل الملف" },
      { status: 500 },
    );
  }
}

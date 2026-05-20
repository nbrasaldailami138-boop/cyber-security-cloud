import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, hashToken } from "@/lib/security";
import { broadcastEvent } from "@/lib/supabaseRealtime";
import { z } from "zod";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

const schema = z.object({
  name: z.string().min(2, "اسم المادة قصير جداً"),
  level: z.enum(["LEVEL_1", "LEVEL_2"]),
  semester: z.enum(["TERM_1", "TERM_2"]),
});

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
    if (payload.role !== "ADMIN" && payload.role !== "MANAGEMENT") {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, level, semester } = validation.data;
    const generatorId = payload.sub as string;
    const generatorName = (payload as any).name || "غير معروف";

    if (payload.role === "MANAGEMENT" && payload.level !== level) {
      return NextResponse.json(
        { success: false, message: "لا يمكنك التوليد لمستوى غير مستواك" },
        { status: 403 },
      );
    }

    const code = generateSecureToken(4).slice(0, 8).toUpperCase();
    const codeHash = hashToken(code);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const levelPrefix = level === "LEVEL_1" ? "L1" : "L2";
    const semesterPrefix = semester === "TERM_1" ? "T1" : "T2";
    const subjectCode = `SUB-${levelPrefix}-${semesterPrefix}-${Date.now().toString(36).toUpperCase()}`;

    const placeholderEmail = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@temp.local`;

    const teacher = await prisma.user.create({
      data: {
        name: `${name} (مدرس)`,
        email: placeholderEmail,
        passwordHash: "",
        role: "TEACHER",
        level,
        status: "PENDING",
        activationCodeHash: codeHash,
        activationExpires: expiresAt,
      },
    });

    await prisma.activationCode.create({
      data: {
        codeHash,
        level,
        role: "TEACHER",
        subjectId: subjectCode,
        expiresAt,
      },
    });

    const subject = await prisma.subject.create({
      data: {
        name,
        code: subjectCode,
        level,
        semester,
        teacherId: teacher.id,
        isActive: true,
      },
    });

    await prisma.generationLog.create({
      data: {
        name,
        role: "TEACHER",
        level,
        code,
        subjectName: name,
        subjectCode,
        semester,
        generatedById: generatorId,
        generatedByName: generatorName,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: generatorId,
        action: "CREATE",
        description: `تم توليد مادة: ${name} - الكود: ${subjectCode} - المستوى: ${level} - ${semester === "TERM_1" ? "الترم الأول" : "الترم الثاني"}`,
        level,
      },
    });

    try {
      broadcastEvent("generation-channel", "subject-generated", {
        name,
        subjectCode,
        level,
        semester,
        timestamp: new Date().toISOString(),
        generatedBy: generatorName,
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `تم توليد المادة ${name} وحساب معلمها بنجاح`,
      data: {
        name,
        subjectCode,
        teacherCode: code,
        level,
        semester,
      },
    });
  } catch (error: any) {
    console.error("Generate Subject Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}

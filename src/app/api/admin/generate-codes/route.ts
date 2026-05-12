import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, hashToken } from "@/lib/security";
import { z } from "zod";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

const generateSchema = z.object({
  names: z
    .array(z.string().min(2, "الاسم قصير جداً"))
    .min(1, "يجب إدخال اسم واحد على الأقل"),
  level: z.enum(["LEVEL_1", "LEVEL_2"]),
  role: z.enum(["STUDENT", "TEACHER", "MANAGEMENT"]),
  subjectName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // التحقق من الصلاحية
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
    const validation = generateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { names, level, role, subjectName } = validation.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const results: any[] = [];

    for (const name of names) {
      const trimmedName = name.trim();
      if (!trimmedName) continue;

      // توليد كود تفعيل فريد
      const activationCode = generateSecureToken(4).slice(0, 8).toUpperCase();
      const codeHash = hashToken(activationCode);

      // تاريخ انتهاء الصلاحية (30 يوم)
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      let email = "";
      let displayName = trimmedName;

      // إذا كان معلماً مع مادة
      if (role === "TEACHER" && subjectName) {
        email = `teacher.${trimmedName.replace(/\s+/g, ".").toLowerCase()}@cybersec.edu`;
        displayName = `${trimmedName} (${subjectName})`;
      } else if (role === "TEACHER") {
        email = `teacher.${trimmedName.replace(/\s+/g, ".").toLowerCase()}@cybersec.edu`;
      } else if (role === "MANAGEMENT") {
        email = `mgmt.${trimmedName.replace(/\s+/g, ".").toLowerCase()}@cybersec.edu`;
      } else {
        email = `student.${trimmedName.replace(/\s+/g, ".").toLowerCase()}@cybersec.edu`;
      }

      try {
        // إنشاء المستخدم
        const user = await prisma.user.create({
          data: {
            name: displayName,
            email,
            passwordHash: "", // سيتم تعيينها عند التفعيل
            role,
            level,
            status: "PENDING",
            activationCodeHash: codeHash,
            activationExpires: expiresAt,
          },
        });

        // حفظ كود التفعيل
        await prisma.activationCode.create({
          data: {
            codeHash,
            level,
            role,
            subjectId: null,
            expiresAt,
          },
        });

        // إذا كان معلماً، إنشاء مادة
        if (role === "TEACHER" && subjectName) {
          const subjectCode = `SUB-${level}-${subjectName.replace(/\s+/g, "-").toUpperCase()}`;

          const subject = await prisma.subject.create({
            data: {
              name: subjectName,
              code: subjectCode,
              level,
              teacherId: user.id,
            },
          });

          // تحديث كود التفعيل باسم المادة
          await prisma.activationCode.updateMany({
            where: { codeHash, usedAt: null },
            data: { subjectId: subject.id },
          });
        }

        results.push({
          name: displayName,
          email,
          code: activationCode,
          role,
          level,
          subject: subjectName || null,
        });
      } catch (err: any) {
        results.push({
          name: trimmedName,
          error: err.message || "فشل الإنشاء",
        });
      }
    }

    // تسجيل العملية
    await prisma.auditLog.create({
      data: {
        userId: payload.sub as string,
        action: "CREATE",
        severity: "INFO",
        description: `توليد ${results.length} حساب`,
        ipAddress: ip,
        level,
        metadata: { role, count: results.length },
      },
    });

    return NextResponse.json({
      status: "success",
      message: `تم توليد ${results.filter((r) => !r.error).length} حساب بنجاح`,
      data: results,
    });
  } catch (error: any) {
    console.error("Generate Codes Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}

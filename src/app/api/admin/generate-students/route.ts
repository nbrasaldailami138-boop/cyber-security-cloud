import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, hashToken } from "@/lib/security";
import { pusher } from "@/lib/pusher";
import { z } from "zod";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

const schema = z.object({
  names: z.array(z.string().min(2, "الاسم قصير جداً")).min(1, "يجب إدخال اسم واحد على الأقل").max(500, "حد أقصى 500 اسم"),
  level: z.enum(["LEVEL_1", "LEVEL_2"]),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, message: validation.error.issues[0].message }, { status: 400 });
    }

    const { names, level } = validation.data;
    const generatorId = payload.sub as string;
    const generatorName = (payload as any).name || "غير معروف";

    // MANAGEMENT can only generate for their own level
    if (payload.role === "MANAGEMENT" && payload.level !== level) {
      return NextResponse.json({ success: false, message: "لا يمكنك التوليد لمستوى غير مستواك" }, { status: 403 });
    }

    const results: any[] = [];

    for (const name of names) {
      try {
        const code = generateSecureToken(4).slice(0, 8).toUpperCase();
        const codeHash = hashToken(code);
        const placeholderEmail = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@temp.local`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const user = await prisma.user.create({
          data: {
            name,
            email: placeholderEmail,
            passwordHash: "",
            role: "STUDENT",
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
            role: "STUDENT",
            expiresAt,
          },
        });

        await prisma.generationLog.create({
          data: {
            name,
            role: "STUDENT",
            level,
            code,
            generatedById: generatorId,
            generatedByName: generatorName,
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: generatorId,
            action: "CREATE",
            description: `تم توليد حساب طالب: ${name} - المستوى: ${level}`,
            level,
          },
        });

        results.push({ name, code, level, role: "STUDENT", success: true });
      } catch (err: any) {
        results.push({ name, error: err.message, success: false });
      }
    }

    try {
      await pusher.trigger("generation-channel", "students-generated", {
        count: results.filter(r => r.success).length,
        level,
        timestamp: new Date().toISOString(),
        generatedBy: generatorName,
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `تم توليد ${results.filter(r => r.success).length} حساب بنجاح`,
      data: results,
    });
  } catch (error: any) {
    console.error("Generate Students Error:", error);
    return NextResponse.json({ success: false, message: "حدث خطأ في السيرفر" }, { status: 500 });
  }
}

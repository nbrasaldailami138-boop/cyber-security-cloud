import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOpts } from "@/lib/webauthn";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // إذا تم إرسال الإيميل، نبحث عن المستخدم
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email, deletedAt: null },
      });

      if (!user || !user.webAuthnEnabled) {
        return NextResponse.json(
          { success: false, message: "البصمة غير مفعلة لهذا الحساب" },
          { status: 400 },
        );
      }

      const options = await generateAuthenticationOpts(user.id);
      return NextResponse.json({ success: true, options, userId: user.id });
    }

    // إذا لم يتم إرسال إيميل، نستخدم Passkey discovery (للجوال)
    // نجلب جميع المستخدمين المفعلين للبصمة
    const users = await prisma.user.findMany({
      where: { webAuthnEnabled: true, deletedAt: null },
      select: { id: true },
      take: 50,
    });

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: "لا توجد حسابات مفعلة بالبصمة" },
        { status: 400 },
      );
    }

    // استخدام أول مستخدم (أو يمكنك استخدام منطق discovery)
    const options = await generateAuthenticationOpts(users[0].id);
    return NextResponse.json({ success: true, options, userId: users[0].id });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

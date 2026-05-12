import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const passwordHash = await argon2.hash("Admin@123", {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const admin = await prisma.user.upsert({
      where: { email: "admin@cybersec.edu" },
      update: {
        passwordHash,
        isActivated: true,
        status: "ACTIVE",
        failedLoginAttempts: 0,
      },
      create: {
        name: "مدير النظام",
        email: "admin@cybersec.edu",
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        isActivated: true,
        failedLoginAttempts: 0,
      },
    });

    console.log("✅ تم إنشاء حساب الأدمن بنجاح!");
    console.log("📧 البريد: admin@cybersec.edu");
    console.log("🔑 كلمة المرور: Admin@123");
    console.log("🆔 ID:", admin.id);
  } catch (error) {
    console.error("❌ فشل إنشاء الأدمن:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

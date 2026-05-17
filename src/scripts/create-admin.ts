/*import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
*/
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const passwordHash = await bcrypt.hash("Tarifa.store.777.nb", 12);

    const admin = await prisma.user.upsert({
      where: { email: "nbraskiani@gmail.com" },
      update: {
        passwordHash,
        isActivated: true,
        status: "ACTIVE",
        failedLoginAttempts: 0,
      },
      create: {
        name: "مدير النظام",
        email: "nbraskiani@gmail.com",
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        isActivated: true,
        failedLoginAttempts: 0,
      },
    });

    console.log("✅ تم إنشاء حساب الأدمن بنجاح!");
    console.log("📧 البريد: nbraskiani@gmail.com");
    console.log("🔑 كلمة المرور: Tarifa.store.777.nb");
    console.log("🆔 ID:", admin.id);
  } catch (error) {
    console.error("❌ فشل إنشاء الأدمن:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  WebAuthnCredential,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";
import { prisma } from "@/lib/prisma";

// إعدادات الموقع - يجب أن تطابق الدومين الحقيقي عند النشر
const rpName = "سحابة الأمن السيبراني";
const rpID =
  process.env.NODE_ENV === "production" ? "your-domain.com" : "localhost";
const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// الخطوة 1: إنشاء خيارات تسجيل بصمة جديدة
export async function generateRegistrationOpts(
  userId: string,
  userEmail: string,
  userName: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new Error("المستخدم غير موجود");

  // حذف أي تسجيل سابق إذا طلب المستخدم إعادة التسجيل
  const existingCredentials = user.webAuthnCredential
    ? [user.webAuthnCredential]
    : [];

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    userDisplayName: userName,
    attestationType: "none",
    excludeCredentials: existingCredentials.map((cred) => {
      try {
        const parsed = JSON.parse(cred);
        return { id: parsed.id, type: "public-key" as const };
      } catch {
        return { id: cred, type: "public-key" as const };
      }
    }),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
      authenticatorAttachment: "platform", // يفضل بصمة الجهاز نفسه
    },
    timeout: 60000,
  });

  // تخزين التحدي (challenge) مؤقتاً - سنستخدم Redis لاحقاً
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: options.challenge },
  });

  return options;
}

// الخطوة 2: التحقق من تسجيل البصمة وحفظها
export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.twoFactorSecret) {
    throw new Error("بيانات التحقق غير موجودة");
  }

  const expectedChallenge = user.twoFactorSecret;

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("فشل التحقق من البصمة");
  }

  // حفظ بيانات الاعتماد
  const credential = {
    id: verification.registrationInfo.credential.id,
    publicKey: verification.registrationInfo.credential.publicKey,
    counter: verification.registrationInfo.credential.counter,
    deviceType: verification.registrationInfo.credentialDeviceType,
    backedUp: verification.registrationInfo.credentialBackedUp,
  };

  await prisma.user.update({
    where: { id: userId },
    data: {
      webAuthnEnabled: true,
      webAuthnCredential: JSON.stringify(credential),
      webAuthnDeviceId: credential.id,
      twoFactorSecret: null, // مسح التحدي
    },
  });

  return { success: true };
}

// الخطوة 3: إنشاء خيارات تسجيل دخول بالبصمة
export async function generateAuthenticationOpts(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.webAuthnCredential || !user.webAuthnEnabled) {
    throw new Error("البصمة غير مفعلة لهذا الحساب");
  }

  let credential;
  try {
    credential = JSON.parse(user.webAuthnCredential);
  } catch {
    throw new Error("بيانات البصمة تالفة. يرجى إعادة تسجيل البصمة.");
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: [
      {
        id: credential.id,
        transports: ["internal", "hybrid"],
      },
    ],
    userVerification: "required",
    timeout: 60000,
  });

  // تخزين التحدي مؤقتاً
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: options.challenge },
  });

  return options;
}

// الخطوة 4: التحقق من البصمة عند الدخول
export async function verifyAuthentication(
  userId: string,
  response: AuthenticationResponseJSON,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.twoFactorSecret || !user.webAuthnCredential) {
    throw new Error("بيانات التحقق غير موجودة");
  }

  let credential;
  try {
    credential = JSON.parse(user.webAuthnCredential);
  } catch {
    throw new Error("بيانات البصمة تالفة");
  }

  const expectedChallenge = user.twoFactorSecret;

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.id,
      publicKey: new Uint8Array(Object.values(credential.publicKey)),
      counter: credential.counter,
      transports: ["internal", "hybrid"],
    },
  });

  if (!verification.verified) {
    throw new Error("فشل التحقق من البصمة");
  }

  // تحديث العداد
  const updatedCredential = {
    ...credential,
    counter: verification.authenticationInfo.newCounter,
  };

  await prisma.user.update({
    where: { id: userId },
    data: {
      webAuthnCredential: JSON.stringify(updatedCredential),
      twoFactorSecret: null,
    },
  });

  return { success: true };
}

// إلغاء تفعيل البصمة
export async function disableWebAuthn(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      webAuthnEnabled: false,
      webAuthnCredential: null,
      webAuthnDeviceId: null,
    },
  });
}

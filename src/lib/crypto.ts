import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const SALT = Buffer.from("cyber-security-salt-2024", "utf8");
const KEY_ITERATIONS = 100000;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  return crypto.pbkdf2Sync(key, SALT, KEY_ITERATIONS, KEY_LENGTH, "sha512");
}

export function encryptMessage(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptMessage(encryptedText: string): string {
  try {
    const parts = encryptedText.split(":");
    const iv = Buffer.from(parts.shift()!, "hex");
    const encrypted = parts.join(":");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "[رسالة مشفرة - تعذر فك التشفير]";
  }
}

import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const KEY = process.env.ENCRYPTION_KEY || "aes-256-cbc-encryption-key-32chars";
const IV_LENGTH = 16;

function getKey(): Buffer {
  return crypto.createHash("sha256").update(KEY).digest();
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

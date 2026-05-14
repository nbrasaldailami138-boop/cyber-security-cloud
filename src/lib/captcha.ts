const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET_KEY;
const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

export function getSiteKey(): string {
  return HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000000";
}

export async function verifyCaptcha(
  token: string | null,
): Promise<boolean> {
  // في وضع التطوير أو إذا ما في secret key، نقبل الطلب
  if (!HCAPTCHA_SECRET || process.env.NODE_ENV === "development") {
    return true;
  }

  if (!token) return false;

  try {
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: HCAPTCHA_SECRET,
        response: token,
      }),
    });

    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

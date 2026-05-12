import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || "default-secret",
);

const publicPaths = [
  "/",
  "/login",
  "/onboarding",
  "/activate",
  "/forgot-password",
  "/api/auth/login",
  "/api/auth/activate",
  "/api/auth/forgot-password",
  "/api/auth/verify-reset-code",
  "/api/auth/reset-password",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/webauthn/login/start",
  "/api/auth/webauthn/login/complete",
  "/api/subjects/active",
];

const adminPaths = ["/admin"];
const managementPaths = ["/management"];
const teacherPaths = ["/teacher"];
const studentPaths = ["/student"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (p) =>
      pathname === p ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/subjects"),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://ik.imagekit.io; font-src 'self'; connect-src 'self' https://*.pusher.com wss://*.pusher.com https://*.upstash.io; frame-src 'self' https://www.youtube.com;",
  );

  if (isPublicPath(pathname)) {
    return response;
  }

  const accessToken = request.cookies.get("accessToken")?.value;

  if (!accessToken) {
    const refreshToken = request.cookies.get("refreshToken")?.value;
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(
          `${request.nextUrl.origin}/api/auth/refresh`,
          {
            method: "POST",
            headers: { Cookie: `refreshToken=${refreshToken}` },
          },
        );

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const newResponse = NextResponse.next();
          newResponse.cookies.set("accessToken", data.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60,
            path: "/",
          });
          return newResponse;
        }
      } catch (e) {
        // فشل التجديد
      }
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET);
    const userRole = payload.role as string;

    if (
      adminPaths.some((p) => pathname.startsWith(p)) &&
      userRole !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (
      managementPaths.some((p) => pathname.startsWith(p)) &&
      userRole !== "MANAGEMENT" &&
      userRole !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (
      teacherPaths.some((p) => pathname.startsWith(p)) &&
      userRole !== "TEACHER" &&
      userRole !== "ADMIN" &&
      userRole !== "MANAGEMENT"
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (
      studentPaths.some((p) => pathname.startsWith(p)) &&
      userRole !== "STUDENT" &&
      userRole !== "ADMIN" &&
      userRole !== "MANAGEMENT" &&
      userRole !== "TEACHER"
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  } catch (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)",
  ],
};

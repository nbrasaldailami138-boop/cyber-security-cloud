import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60s"),
  analytics: true,
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "تجاوزت عدد الطلبات المسموح به" },
        { status: 429 },
      );
    }

    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 },
      );
    }

    const payload = await verifyAccessToken(token);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "غير مصرح - للأدمن فقط" },
        { status: 403 },
      );
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalErrors,
      totalWarnings,
      totalIntrusions,
      totalVulnerabilities,
      totalAttackAttempts,
      totalBans,
      recentIntrusions,
      criticalLogs,
      attacksLast24h,
      attacksLast7d,
    ] = await Promise.all([
      prisma.auditLog.count({
        where: { severity: { in: ["ERROR", "CRITICAL"] } },
      }),
      prisma.auditLog.count({
        where: { severity: "WARNING" },
      }),
      // تسللات (SUSPICIOUS_ACTIVITY + FAILED_LOGIN)
      prisma.auditLog.count({
        where: {
          OR: [{ action: "SUSPICIOUS_ACTIVITY" }, { action: "FAILED_LOGIN" }],
        },
      }),
      prisma.auditLog.count({
        where: { severity: "CRITICAL" },
      }),
      prisma.auditLog.count({
        where: {
          OR: [{ action: "FAILED_LOGIN" }, { action: "SUSPICIOUS_ACTIVITY" }],
        },
      }),
      prisma.auditLog.count({
        where: {
          description: { contains: "حظر" },
          createdAt: { gte: last7d },
        },
      }),
      // آخر 20 تسللاً ومحاولة فاشلة
      prisma.auditLog.findMany({
        where: {
          OR: [{ action: "SUSPICIOUS_ACTIVITY" }, { action: "FAILED_LOGIN" }],
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          severity: true,
          description: true,
          ipAddress: true,
          deviceInfo: true,
          createdAt: true,
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.auditLog.findMany({
        where: { severity: "CRITICAL" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          action: true,
          severity: true,
          description: true,
          ipAddress: true,
          deviceInfo: true,
          createdAt: true,
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          OR: [
            { action: "FAILED_LOGIN" },
            { action: "SUSPICIOUS_ACTIVITY" },
            { severity: "CRITICAL" },
          ],
          createdAt: { gte: last24h },
        },
      }),
      prisma.auditLog.count({
        where: {
          OR: [
            { action: "FAILED_LOGIN" },
            { action: "SUSPICIOUS_ACTIVITY" },
            { severity: "CRITICAL" },
          ],
          createdAt: { gte: last7d },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          errors: totalErrors,
          warnings: totalWarnings,
          intrusions: totalIntrusions,
          vulnerabilities: totalVulnerabilities,
          attackAttempts: totalAttackAttempts,
          bans: totalBans,
        },
        trends: {
          attacksLast24h,
          attacksLast7d,
        },
        recentIntrusions,
        criticalLogs,
      },
    });
  } catch (error) {
    console.error("Security stats error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في جلب الإحصائيات" },
      { status: 500 },
    );
  }
}

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type") || "all";
    const severity = searchParams.get("severity") || "all";
    const search = searchParams.get("search") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const where: any = {};

    if (type !== "all") {
      switch (type) {
        case "intrusion":
          where.action = "SUSPICIOUS_ACTIVITY";
          break;
        case "vulnerability":
          where.severity = "CRITICAL";
          break;
        case "attack":
          where.OR = [
            { action: "FAILED_LOGIN" },
            { action: "SUSPICIOUS_ACTIVITY" },
          ];
          break;
        case "ban":
          where.description = { contains: "حظر" };
          break;
        case "error":
          where.severity = { in: ["ERROR", "CRITICAL"] };
          break;
      }
    }

    if (severity !== "all") {
      where.severity = severity;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { description: { contains: search, mode: "insensitive" } },
            { ipAddress: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          action: true,
          severity: true,
          description: true,
          ipAddress: true,
          deviceInfo: true,
          level: true,
          metadata: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Security logs error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في جلب السجلات" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      action,
      severity = "WARNING",
      description,
      ipAddress,
      deviceInfo,
      level,
      metadata,
    } = body;

    if (!action || !description) {
      return NextResponse.json(
        { success: false, error: "الحقول المطلوبة مفقودة" },
        { status: 400 },
      );
    }

    const log = await prisma.auditLog.create({
      data: {
        userId: payload.sub,
        action,
        severity,
        description,
        ipAddress: ipAddress || ip,
        deviceInfo: deviceInfo || "",
        level: level || undefined,
        metadata: metadata || undefined,
      },
    });

    // إرسال حدث Supabase Broadcast لتحديث الطرفية والحارس
    try {
      const { broadcastEvent } = await import("@/lib/supabaseRealtime");
      await broadcastEvent("security-terminal", "new-log", {
        id: log.id,
        action: log.action,
        severity: log.severity,
        description: log.description,
        ipAddress: log.ipAddress,
        deviceInfo: log.deviceInfo,
        createdAt: log.createdAt.toISOString(),
      });
      await broadcastEvent("security-radar", "stats-update", {
        timestamp: new Date().toISOString(),
      });
    } catch (supabaseError) {
      console.error("Failed to send Supabase Broadcast event:", supabaseError);
    }

    return NextResponse.json({ success: true, data: log }, { status: 201 });
  } catch (error) {
    console.error("Security log create error:", error);
    return NextResponse.json(
      { success: false, error: "خطأ في تسجيل الحدث" },
      { status: 500 },
    );
  }
}

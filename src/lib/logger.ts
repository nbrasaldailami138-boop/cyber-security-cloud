import winston from "winston";

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

// تسجيل أخطاء Supabase Realtime
export function logBroadcastError(
  channel: string,
  event: string,
  error: unknown,
): void {
  logger.error("Broadcast failed", { channel, event, error });
}

export function logSecurityEvent(
  action: string,
  details: Record<string, unknown>,
): void {
  logger.warn("Security event", { action, ...details });
}

export default logger;

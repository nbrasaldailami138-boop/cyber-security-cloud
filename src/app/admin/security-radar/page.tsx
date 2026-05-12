"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";

interface SecurityLog {
  id: string;
  action: string;
  severity: string;
  description: string;
  ipAddress: string;
  createdAt: string;
  user?: { name: string };
}

export default function SecurityRadarPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [stats, setStats] = useState({ failed: 0, suspicious: 0, critical: 0 });

  useEffect(() => {
    loadSecurityLogs();
  }, []);

  const loadSecurityLogs = async () => {
    try {
      const res = await fetch("/api/admin/audit-log");
      const data = await res.json();
      if (data.success) {
        const securityLogs = data.data.filter(
          (l: SecurityLog) =>
            l.action === "FAILED_LOGIN" ||
            l.action === "SUSPICIOUS_ACTIVITY" ||
            l.severity === "CRITICAL" ||
            l.severity === "ERROR",
        );
        setLogs(securityLogs);
        setStats({
          failed: securityLogs.filter(
            (l: SecurityLog) => l.action === "FAILED_LOGIN",
          ).length,
          suspicious: securityLogs.filter(
            (l: SecurityLog) => l.action === "SUSPICIOUS_ACTIVITY",
          ).length,
          critical: securityLogs.filter(
            (l: SecurityLog) => l.severity === "CRITICAL",
          ).length,
        });
      }
    } catch (err) {}
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "#ff3131";
      case "ERROR":
        return "#f85149";
      case "WARNING":
        return "#ffca28";
      default:
        return "#00e5ff";
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#010204",
        fontFamily: "'Cairo', sans-serif",
        color: "#fff",
      }}
    >
      <Header />
      <Sidebar />
      <PageTransition>
      <main
        style={{
          padding: "100px 20px 60px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            color: "#00e5ff",
            fontSize: "1.8rem",
            fontWeight: 800,
            marginBottom: "25px",
          }}
        >
          🛡️ رادار الأخطاء والتسلل
        </h2>

        {/* بطاقات إحصائية */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "15px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              background: "rgba(248,81,73,0.1)",
              border: "1px solid #f85149",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: "2rem", fontWeight: 800, color: "#f85149" }}
            >
              {stats.failed}
            </div>
            <div style={{ color: "#8b949e", fontSize: "0.85rem" }}>
              محاولات فاشلة
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,202,40,0.1)",
              border: "1px solid #ffca28",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: "2rem", fontWeight: 800, color: "#ffca28" }}
            >
              {stats.suspicious}
            </div>
            <div style={{ color: "#8b949e", fontSize: "0.85rem" }}>
              أنشطة مشبوهة
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,49,49,0.1)",
              border: "1px solid #ff3131",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: "2rem", fontWeight: 800, color: "#ff3131" }}
            >
              {stats.critical}
            </div>
            <div style={{ color: "#8b949e", fontSize: "0.85rem" }}>حرجة</div>
          </div>
        </div>

        {/* جدول السجلات الأمنية */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th
                  style={{
                    padding: "12px",
                    color: "#8b949e",
                    textAlign: "right",
                  }}
                >
                  النوع
                </th>
                <th
                  style={{
                    padding: "12px",
                    color: "#8b949e",
                    textAlign: "right",
                  }}
                >
                  الوصف
                </th>
                <th
                  style={{
                    padding: "12px",
                    color: "#8b949e",
                    textAlign: "right",
                  }}
                >
                  IP
                </th>
                <th
                  style={{
                    padding: "12px",
                    color: "#8b949e",
                    textAlign: "right",
                  }}
                >
                  التاريخ
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                >
                  <td style={{ padding: "10px" }}>
                    <span
                      style={{
                        color: getSeverityColor(log.severity),
                        background: `${getSeverityColor(log.severity)}20`,
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                      }}
                    >
                      {log.action === "FAILED_LOGIN"
                        ? "⛔ دخول فاشل"
                        : log.action === "SUSPICIOUS_ACTIVITY"
                          ? "⚠️ مشبوه"
                          : "🔴 " + log.severity}
                    </span>
                  </td>
                  <td style={{ padding: "10px" }}>{log.description}</td>
                  <td
                    style={{
                      padding: "10px",
                      fontFamily: "monospace",
                      color: "#8b949e",
                      direction: "ltr",
                      textAlign: "right",
                    }}
                  >
                    {log.ipAddress}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      color: "#8b949e",
                      fontSize: "0.75rem",
                    }}
                  >
                    {new Date(log.createdAt).toLocaleString("ar-YE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <p
              style={{
                textAlign: "center",
                color: "#8b949e",
                marginTop: "30px",
              }}
            >
              ✅ لا توجد تهديدات حالية
            </p>
          )}
        </div>
      </main>
      </PageTransition>
      <Footer />
    </div>
  );
}

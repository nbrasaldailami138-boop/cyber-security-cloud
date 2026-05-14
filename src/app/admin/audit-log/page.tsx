"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";
import Pagination from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { pageContainer, mainContent, sectionTitle } from "@/lib/theme";

interface LogItem {
  id: string;
  action: string;
  severity: string;
  description: string;
  ipAddress: string;
  createdAt: string;
  user?: { name: string; role: string };
  level?: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);

  const pag = usePagination(1, 20);

  useEffect(() => {
    loadLogs();
  }, [pag.page]);

  const loadLogs = async () => {
    try {
      const res = await fetch(`/api/admin/audit-log?page=${pag.page}&limit=${pag.limit}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        pag.setTotal(data.total || 0);
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

  const getActionLabel = (action: string) => {
    const labels: any = {
      LOGIN: "تسجيل دخول",
      LOGOUT: "تسجيل خروج",
      CREATE: "إنشاء",
      UPDATE: "تعديل",
      DELETE: "حذف",
      UPLOAD: "رفع",
      DOWNLOAD: "تحميل",
      EVALUATE: "تقييم",
      PUBLISH: "نشر",
      FAILED_LOGIN: "دخول فاشل",
      SUSPICIOUS_ACTIVITY: "نشاط مشبوه",
    };
    return labels[action] || action;
  };

  return (
    <div style={pageContainer}>
      <Header />
      <Sidebar />
      <PageTransition>
      <main style={mainContent}>
        <h2 style={sectionTitle}>
          📜 سجل العمليات
        </h2>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  textAlign: "right",
                }}
              >
                <th style={{ padding: "12px", color: "#8b949e" }}>النوع</th>
                <th style={{ padding: "12px", color: "#8b949e" }}>الوصف</th>
                <th style={{ padding: "12px", color: "#8b949e" }}>المستخدم</th>
                <th style={{ padding: "12px", color: "#8b949e" }}>IP</th>
                <th style={{ padding: "12px", color: "#8b949e" }}>التاريخ</th>
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
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td style={{ padding: "10px", color: "#e6edf3" }}>
                    {log.description}
                  </td>
                  <td style={{ padding: "10px", color: "#8b949e" }}>
                    {log.user ? `${log.user.name}` : "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      color: "#8b949e",
                      fontFamily: "monospace",
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
        </div>
        <Pagination page={pag.page} totalPages={pag.totalPages} onPageChange={pag.goTo} />
      </main>
      </PageTransition>
      <Footer />
    </div>
  );
}

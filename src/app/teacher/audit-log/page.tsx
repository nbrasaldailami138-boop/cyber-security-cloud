"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";
import Pagination from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";

export default function TeacherAuditLogPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const pag = usePagination(1, 20);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "TEACHER" && role !== "ADMIN" && role !== "MANAGEMENT") {
      router.push("/login");
      return;
    }
    fetchLogs();
  }, [pag.page]);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/admin/audit-log?page=${pag.page}&limit=${pag.limit}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
        pag.setTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (s: string) => {
    switch (s) {
      case "CRITICAL": return "#ff3131";
      case "ERROR": return "#f85149";
      case "WARNING": return "#ffca28";
      default: return "#8b949e";
    }
  };

  const getActionLabel = (a: string) => {
    const labels: Record<string, string> = {
      LOGIN: "تسجيل دخول",
      LOGOUT: "تسجيل خروج",
      CREATE: "إنشاء",
      UPDATE: "تحديث",
      DELETE: "حذف",
      UPLOAD: "رفع ملف",
      DOWNLOAD: "تحميل",
      EVALUATE: "تقييم",
      PUBLISH: "نشر",
      FAILED_LOGIN: "محاولة دخول فاشلة",
      SUSPICIOUS_ACTIVITY: "نشاط مشبوه",
      LEVEL_PROMOTION: "ترقية مستوى",
      SEMESTER_SWITCH: "تبديل ترم",
    };
    return labels[a] || a;
  };

  const glassCard: React.CSSProperties = {
    background: "rgba(13, 17, 23, 0.92)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(0, 229, 255, 0.2)",
    borderRadius: "16px",
    padding: "24px",
  };

  return (
    <div className="min-h-screen bg-[#010204]" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <Header />
      <Sidebar />
      <PageTransition>
      <div className="relative z-10 pr-0 lg:pr-[20px] p-4 lg:p-8 pt-[100px] max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white mb-2 text-center">سجل العمليات</h1>
          <p className="text-[#8b949e] text-sm mb-8 text-center">سجل جميع العمليات والأنشطة</p>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-10 h-10 border-2 border-[#00e5ff] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <div style={glassCard}>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <th className="p-3 text-[#8b949e] text-sm">الوقت</th>
                      <th className="p-3 text-[#8b949e] text-sm">العملية</th>
                      <th className="p-3 text-[#8b949e] text-sm">الوصف</th>
                      <th className="p-3 text-[#8b949e] text-sm">المستخدم</th>
                      <th className="p-3 text-[#8b949e] text-sm">المستوى</th>
                      <th className="p-3 text-[#8b949e] text-sm">الخطورة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: any) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td className="p-3 text-[#8b949e] text-xs">
                          {new Date(log.createdAt).toLocaleString("ar-YE")}
                        </td>
                        <td className="p-3">
                          <span style={{
                            padding: "3px 10px",
                            borderRadius: "6px",
                            background: "rgba(0,229,255,0.08)",
                            color: "#00e5ff",
                            fontSize: "0.75rem",
                          }}>
                            {getActionLabel(log.action)}
                          </span>
                        </td>
                        <td className="p-3 text-white text-sm">{log.description}</td>
                        <td className="p-3 text-[#8b949e] text-sm">{log.user?.name || "—"}</td>
                        <td className="p-3 text-[#8b949e] text-xs">
                          {log.level === "LEVEL_1" ? "الأول" : log.level === "LEVEL_2" ? "الثاني" : "—"}
                        </td>
                        <td className="p-3">
                          <span style={{
                            padding: "3px 10px",
                            borderRadius: "6px",
                            background: `${getSeverityColor(log.severity)}15`,
                            color: getSeverityColor(log.severity),
                            fontSize: "0.75rem",
                          }}>
                            {log.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-[#8b949e]">
                          لا توجد عمليات مسجلة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={pag.page} totalPages={pag.totalPages} onPageChange={pag.goTo} />
            </div>
          )}
        </motion.div>
      </div>
      </PageTransition>
    </div>
  );
}

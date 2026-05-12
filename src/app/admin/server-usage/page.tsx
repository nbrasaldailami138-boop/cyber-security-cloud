"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";

export default function AdminServerUsagePage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "ADMIN") { router.push("/login"); return; }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/server/stats");
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const glassCard: React.CSSProperties = {
    background: "rgba(13, 17, 23, 0.92)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(0, 229, 255, 0.2)",
    borderRadius: "16px",
    padding: "24px",
  };

  const statCards = [
    { label: "إجمالي المستخدمين", value: stats?.totalUsers || 0, color: "#00e5ff" },
    { label: "المستخدمين النشطين", value: stats?.activeUsers || 0, color: "#2ea043" },
    { label: "بانتظار التفعيل", value: stats?.pendingUsers || 0, color: "#ffca28" },
    { label: "التكاليف المرفوعة", value: stats?.totalAssignments || 0, color: "#bf5af2" },
    { label: "التكاليف المقيمة", value: stats?.evaluatedAssignments || 0, color: "#39ff14" },
    { label: "الملفات التعليمية", value: stats?.totalContent || 0, color: "#7a00ff" },
    { label: "المواد الدراسية", value: stats?.totalSubjects || 0, color: "#ff3131" },
  ];

  return (
    <div className="min-h-screen bg-[#010204]" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <Header />
      <Sidebar />
      <PageTransition>
      <div className="relative z-10 pr-0 lg:pr-[20px] p-4 lg:p-8 pt-[100px] max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white mb-2 text-center">إحصائيات واستهلاك السيرفر</h1>
          <p className="text-[#8b949e] text-sm mb-8 text-center">نظرة شاملة على مؤشرات الأداء لمنصة سحابة الأمن السيبراني</p>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-10 h-10 border-2 border-[#00e5ff] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {statCards.map((card, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    style={{
                      ...glassCard,
                      textAlign: "center",
                      borderColor: `${card.color}33`,
                    }}
                  >
                    <p style={{ color: card.color, fontSize: "2.5rem", fontWeight: 800, fontFamily: "'Orbitron', sans-serif" }}>
                      {card.value}
                    </p>
                    <p style={{ color: "#8b949e", fontSize: "0.9rem", marginTop: 8 }}>{card.label}</p>
                  </motion.div>
                ))}
              </div>

              <div style={glassCard}>
                <h2 className="text-lg font-bold text-white mb-4">معلومات النظام</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[#8b949e] text-sm">اسم المنصة</p>
                    <p className="text-white">سحابة الأمن السيبراني</p>
                  </div>
                  <div>
                    <p className="text-[#8b949e] text-sm">الجامعة</p>
                    <p className="text-white">جامعة ذمار - كلية الحاسبات</p>
                  </div>
                  <div>
                    <p className="text-[#8b949e] text-sm">التخزين السحابي</p>
                    <p className="text-white">ImageKit</p>
                  </div>
                  <div>
                    <p className="text-[#8b949e] text-sm">قاعدة البيانات</p>
                    <p className="text-white">PostgreSQL (Supabase)</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
      </PageTransition>
    </div>
  );
}

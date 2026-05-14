"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function ManagementDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "MANAGEMENT" && role !== "ADMIN") {
      router.push("/login");
      return;
    }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/server/stats");
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    { label: "إدارة التوليد", path: "/management/generation", icon: "🏗️", color: "#00e5ff" },
    { label: "ترقية المستخدمين", path: "/management/upgrade", icon: "⬆️", color: "#bf5af2" },
    { label: "الحسابات المفعلة", path: "/management/activated-accounts", icon: "✅", color: "#2ea043" },
    { label: "استهلاك السيرفر", path: "/management/server-usage", icon: "📊", color: "#ffca28" },
    { label: "المكتبة التعليمية", path: "/library", icon: "📚", color: "#00e5ff" },
    { label: "المحادثة", path: "/chat", icon: "💬", color: "#39ff14" },
  ];

  return (
    <div className="min-h-screen bg-[#010204]" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <Header />
      <Sidebar />

      <PageTransition>
      <div className="relative z-10 pr-0 lg:pr-[20px] p-4 lg:p-8 pt-[100px] max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 text-center lg:text-right">
            لوحة تحكم الإدارة
          </h1>
          <p className="text-[#8b949e] text-sm mb-8 text-center lg:text-right">
            إدارة المستوى الدراسي والإشراف على الطلاب والمعلمين
          </p>

          {loading ? (
            <LoadingSkeleton variant="card" count={4} />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {[
                  { label: "إجمالي المستخدمين", value: stats?.totalUsers || 0, color: "#00e5ff" },
                  { label: "الحسابات المفعلة", value: stats?.activeUsers || 0, color: "#2ea043" },
                  { label: "الطلاب المنتظرين", value: stats?.pendingUsers || 0, color: "#ffca28" },
                  { label: "التكاليف المرفوعة", value: stats?.totalAssignments || 0, color: "#bf5af2" },
                ].map((card, i) => (
                  <motion.div
                    className="hover-glow"
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    style={{
                      background: "rgba(13, 17, 23, 0.92)",
                      backdropFilter: "blur(20px)",
                      border: `1px solid ${card.color}33`,
                      borderRadius: "16px",
                      padding: "20px",
                      textAlign: "center",
                    }}
                  >
                    <p style={{ color: card.color, fontSize: "2rem", fontWeight: 800, fontFamily: "'Orbitron', sans-serif" }}>
                      {card.value}
                    </p>
                    <p style={{ color: "#8b949e", fontSize: "0.85rem", marginTop: 8 }}>{card.label}</p>
                  </motion.div>
                ))}
              </div>

              <h2 className="text-xl font-bold text-white mb-4">الاختصارات السريعة</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {quickLinks.map((link, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    onClick={() => router.push(link.path)}
                    style={{
                      background: "rgba(13, 17, 23, 0.92)",
                      backdropFilter: "blur(20px)",
                      border: `1px solid ${link.color}22`,
                      borderRadius: "16px",
                      padding: "20px",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = link.color;
                      e.currentTarget.style.boxShadow = `0 0 30px ${link.color}22`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${link.color}22`;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>{link.icon}</div>
                    <p className="text-white font-bold text-sm">{link.label}</p>
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
      </PageTransition>
    </div>
  );
}

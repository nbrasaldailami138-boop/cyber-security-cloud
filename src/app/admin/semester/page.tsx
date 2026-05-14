"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { csrfFetch } from "@/lib/csrfClient";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";

type Semester = "TERM_1" | "TERM_2";

export default function SemesterManagementPage() {
  const router = useRouter();
  const [currentSemesters, setCurrentSemesters] = useState<Record<string, Semester>>({});
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "ADMIN") {
      router.push("/login");
      return;
    }
    fetchSemesters();
  }, []);

  const fetchSemesters = async () => {
    try {
      const [l1, l2] = await Promise.all([
        fetch("/api/semester/switch?level=LEVEL_1"),
        fetch("/api/semester/switch?level=LEVEL_2"),
      ]);
      const d1 = await l1.json();
      const d2 = await l2.json();
      setCurrentSemesters({
        LEVEL_1: d1.data?.semester || "TERM_1",
        LEVEL_2: d2.data?.semester || "TERM_1",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const switchSemester = async (level: string, newSemester: Semester) => {
    setSwitching(level);
    setMessage("");
    try {
      const res = await csrfFetch("/api/semester/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, semester: newSemester }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentSemesters((prev) => ({ ...prev, [level]: newSemester }));
        setMessage(`✅ ${level === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني"}: تم التبديل إلى ${newSemester === "TERM_1" ? "الترم الأول" : "الترم الثاني"}`);
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch {
      setMessage("❌ حدث خطأ في الاتصال");
    } finally {
      setSwitching(null);
    }
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
      <div className="relative z-10 pr-0 lg:pr-[20px] p-4 lg:p-8 pt-[100px] max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 text-center">إدارة الترم الدراسي</h1>
          <p className="text-[#8b949e] text-sm mb-8 text-center">التحكم بالترم الحالي لكل مستوى دراسي</p>

          {message && (
            <div style={{ ...glassCard, borderColor: "#2ea04344", marginBottom: 20, textAlign: "center" }}>
              <p className="text-white">{message}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-10 h-10 border-2 border-[#00e5ff] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(["LEVEL_1", "LEVEL_2"] as const).map((level) => {
                const current = currentSemesters[level] || "TERM_1";
                const levelLabel = level === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني";
                const nextSemester: Semester = current === "TERM_1" ? "TERM_2" : "TERM_1";
                const nextLabel = nextSemester === "TERM_1" ? "الترم الأول" : "الترم الثاني";

                return (
                  <div key={level} style={glassCard}>
                    <h2 className="text-xl font-bold text-white mb-4 text-center">{levelLabel}</h2>
                    <div className="flex items-center justify-center gap-4 mb-6">
                      <span style={{
                        padding: "8px 20px",
                        borderRadius: "10px",
                        background: current === "TERM_1"
                          ? "rgba(0, 229, 255, 0.15)"
                          : "rgba(57, 255, 20, 0.15)",
                        border: `1px solid ${current === "TERM_1" ? "#00e5ff" : "#39ff14"}44`,
                        color: current === "TERM_1" ? "#00e5ff" : "#39ff14",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                      }}>
                        {current === "TERM_1" ? "الترم الأول" : "الترم الثاني"}
                      </span>
                    </div>
                    <button
                      onClick={() => switchSemester(level, nextSemester)}
                      disabled={switching === level}
                      style={{
                        width: "100%",
                        padding: "14px",
                        border: "none",
                        borderRadius: "14px",
                        background: "linear-gradient(135deg, #2188ff, #0066cc)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1rem",
                        fontFamily: "'Cairo', sans-serif",
                        cursor: switching === level ? "not-allowed" : "pointer",
                        opacity: switching === level ? 0.6 : 1,
                      }}
                    >
                      {switching === level ? "⚡ جاري التبديل..." : `🔄 التبديل إلى ${nextLabel}`}
                    </button>
                    <p className="text-[#8b949e] text-xs mt-3 text-center">
                      عند التبديل سيتم إيقاف الرفع لمواد الترم الحالي وتفعيل مواد الترم الجديد
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
      </PageTransition>
    </div>
  );
}

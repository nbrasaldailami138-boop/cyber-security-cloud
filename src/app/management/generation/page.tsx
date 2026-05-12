"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";

export default function ManagementGenerationPage() {
  const router = useRouter();
  const [role, setRole] = useState("STUDENT");
  const [names, setNames] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const r = localStorage.getItem("userRole");
    if (r !== "MANAGEMENT" && r !== "ADMIN") { router.push("/login"); return; }
  }, []);

  const handleGenerate = async () => {
    if (!names.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const namesList = names.split("\n").map((n) => n.trim()).filter(Boolean);
      const res = await fetch("/api/admin/generate-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          names: namesList,
          level: localStorage.getItem("userLevel") || "LEVEL_1",
          role,
          subjectName: role === "TEACHER" ? subjectName : undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ status: "error", message: "فشل الاتصال" });
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold text-white mb-2 text-center">إدارة التوليد</h1>
          <p className="text-[#8b949e] text-sm mb-8 text-center">توليد حسابات الطلاب والمواد الدراسية</p>

          <div style={glassCard} className="mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-[#8b949e] text-sm block mb-2">نوع الحساب</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "13px 15px",
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    borderRadius: "14px",
                    fontSize: "0.95rem",
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  <option value="STUDENT">طالب</option>
                  <option value="TEACHER">معلم</option>
                </select>
              </div>

              {role === "TEACHER" && (
                <div>
                  <label className="text-[#8b949e] text-sm block mb-2">اسم المادة</label>
                  <input
                    type="text"
                    placeholder="مثال: أمن الشبكات"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "13px 15px",
                      background: "rgba(0,0,0,0.5)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#fff",
                      borderRadius: "14px",
                      fontSize: "0.95rem",
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  />
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="text-[#8b949e] text-sm block mb-2">الأسماء (اسم واحد في كل سطر)</label>
              <textarea
                value={names}
                onChange={(e) => setNames(e.target.value)}
                rows={8}
                placeholder="أدخل أسماء المستخدمين، كل اسم في سطر"
                style={{
                  width: "100%",
                  padding: "13px 15px",
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  borderRadius: "14px",
                  fontSize: "0.95rem",
                  fontFamily: "'Cairo', sans-serif",
                  resize: "vertical",
                }}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !names.trim()}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #238636, #2ea043)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1rem",
                fontFamily: "'Cairo', sans-serif",
                cursor: loading || !names.trim() ? "not-allowed" : "pointer",
                opacity: loading || !names.trim() ? 0.6 : 1,
              }}
            >
              {loading ? "⚡ جاري التوليد..." : "🚀 توليد الحسابات"}
            </button>
          </div>

          {result && (
            <div style={glassCard}>
              <h3 className="text-lg font-bold text-white mb-4">
                {result.status === "success" ? "✅ تم التوليد بنجاح" : "❌ فشل التوليد"}
              </h3>
              {result.data && result.data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <th className="p-2 text-[#8b949e] text-sm">الاسم</th>
                        <th className="p-2 text-[#8b949e] text-sm">البريد</th>
                        <th className="p-2 text-[#8b949e] text-sm">كود التفعيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.map((item: any, i: number) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td className="p-2 text-white text-sm">{item.name}</td>
                          <td className="p-2 text-[#8b949e] text-sm">{item.email}</td>
                          <td className="p-2">
                            <span style={{
                              padding: "3px 10px",
                              borderRadius: "6px",
                              background: "rgba(0,229,255,0.1)",
                              color: "#00e5ff",
                              fontSize: "0.8rem",
                              fontFamily: "'Orbitron', monospace",
                              direction: "ltr",
                              display: "inline-block",
                            }}>
                              {item.code}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
      </PageTransition>
    </div>
  );
}

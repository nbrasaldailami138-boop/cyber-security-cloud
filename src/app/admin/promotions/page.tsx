"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";

export default function PromotionsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "ADMIN") { router.push("/login"); return; }
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/promotion/list?status=PENDING&limit=100");
      const data = await res.json();
      if (data.success) setRequests(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleAction = async (action: "APPROVED" | "REJECTED") => {
    if (selected.size === 0) {
      setMessage("❌ يرجى اختيار طلب واحد على الأقل");
      return;
    }
    setMessage("");
    try {
      const res = await fetch("/api/promotion/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestIds: Array.from(selected), action }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✅ ${action === "APPROVED" ? "تمت الموافقة" : "تم الرفض"} على ${data.count} طلب`);
        setSelected(new Set());
        fetchRequests();
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch {
      setMessage("❌ حدث خطأ");
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
      <div className="relative z-10 pr-0 lg:pr-[20px] p-4 lg:p-8 pt-[100px] max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 text-center">إدارة ترقية المستويات</h1>
          <p className="text-[#8b949e] text-sm mb-8 text-center">الموافقة على طلبات ترقية الطلاب من مستوى لآخر</p>

          {message && (
            <div style={{ ...glassCard, borderColor: "#2ea04344", marginBottom: 20, textAlign: "center" }}>
              <p className="text-white">{message}</p>
            </div>
          )}

          {selected.size > 0 && (
            <div className="flex gap-3 mb-6 justify-center">
              <button onClick={() => handleAction("APPROVED")} style={{
                padding: "12px 30px",
                border: "none",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #238636, #2ea043)",
                color: "#fff",
                fontWeight: 700,
                fontFamily: "'Cairo', sans-serif",
                cursor: "pointer",
              }}>
                ✅ موافقة على {selected.size} طلب
              </button>
              <button onClick={() => handleAction("REJECTED")} style={{
                padding: "12px 30px",
                border: "none",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #da3633, #f85149)",
                color: "#fff",
                fontWeight: 700,
                fontFamily: "'Cairo', sans-serif",
                cursor: "pointer",
              }}>
                ❌ رفض {selected.size} طلب
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-10 h-10 border-2 border-[#00e5ff] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : requests.length === 0 ? (
            <div style={glassCard} className="text-center py-10">
              <p className="text-[#8b949e] text-lg">لا توجد طلبات ترقية معلقة</p>
            </div>
          ) : (
            <div style={glassCard}>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <th className="p-3 text-[#8b949e] text-sm">اختيار</th>
                      <th className="p-3 text-[#8b949e] text-sm">الاسم</th>
                      <th className="p-3 text-[#8b949e] text-sm">البريد</th>
                      <th className="p-3 text-[#8b949e] text-sm">من مستوى</th>
                      <th className="p-3 text-[#8b949e] text-sm">إلى مستوى</th>
                      <th className="p-3 text-[#8b949e] text-sm">تاريخ الطلب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req: any) => (
                      <tr key={req.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selected.has(req.id)}
                            onChange={() => toggleSelect(req.id)}
                            style={{ accentColor: "#00e5ff", transform: "scale(1.2)" }}
                          />
                        </td>
                        <td className="p-3 text-white">{req.user?.name || "—"}</td>
                        <td className="p-3 text-[#8b949e] text-sm">{req.user?.email || "—"}</td>
                        <td className="p-3">
                          <span style={{
                            padding: "4px 12px",
                            borderRadius: "8px",
                            background: "rgba(0,229,255,0.1)",
                            color: "#00e5ff",
                            fontSize: "0.8rem",
                          }}>
                            {req.fromLevel === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span style={{
                            padding: "4px 12px",
                            borderRadius: "8px",
                            background: "rgba(57,255,20,0.1)",
                            color: "#39ff14",
                            fontSize: "0.8rem",
                          }}>
                            {req.toLevel === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني"}
                          </span>
                        </td>
                        <td className="p-3 text-[#8b949e] text-sm">
                          {new Date(req.createdAt).toLocaleDateString("ar-YE")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </div>
      </PageTransition>
    </div>
  );
}

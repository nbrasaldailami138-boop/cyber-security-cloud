"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";

export default function CreateAnnouncementPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("LEVEL_1");
  const [role, setRole] = useState("");
  const [userLevel, setUserLevel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    const r = localStorage.getItem("userRole") || "";
    const l = localStorage.getItem("userLevel") || "";
    setRole(r);
    setUserLevel(l);
    if (r === "MANAGEMENT" || r === "TEACHER") setLevel(l);
  }, []);

  const handleSubmit = async () => {
    setMessage("");
    if (!title.trim() || !description.trim()) {
      setMessage("العنوان والوصف مطلوبان");
      setMessageType("error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/announcements/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), level }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("تم نشر التعميم بنجاح");
        setMessageType("success");
        setTitle("");
        setDescription("");
      } else {
        setMessage(data.message);
        setMessageType("error");
      }
    } catch {
      setMessage("حدث خطأ في الاتصال");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#010204", fontFamily: "'Cairo', sans-serif", color: "#fff" }}>
      <Header />
      <Sidebar />
      <PageTransition>
      <main style={{ padding: "100px 20px 60px", maxWidth: "700px", margin: "0 auto" }}>
        <h2 style={{ color: "#00e5ff", fontSize: "1.8rem", fontWeight: 800, marginBottom: "25px" }}>
          📢 نشر تعميم جديد
        </h2>

        <div style={{ background: "rgba(22,27,34,0.6)", backdropFilter: "blur(15px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "25px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div>
              <label style={{ color: "#8b949e", fontSize: "0.85rem", marginBottom: "5px", display: "block" }}>العنوان</label>
              <input type="text" placeholder="عنوان التعميم" value={title} onChange={(e) => setTitle(e.target.value)}
                style={{ width: "100%", padding: "12px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", fontFamily: "'Cairo', sans-serif" }} />
            </div>

            <div>
              <label style={{ color: "#8b949e", fontSize: "0.85rem", marginBottom: "5px", display: "block" }}>الوصف</label>
              <textarea placeholder="وصف التعميم" value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
                style={{ width: "100%", padding: "12px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", fontFamily: "'Cairo', sans-serif", resize: "vertical" }} />
            </div>

            {role === "ADMIN" && (
              <div>
                <label style={{ color: "#8b949e", fontSize: "0.85rem", marginBottom: "5px", display: "block" }}>المستوى</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)}
                  style={{ width: "100%", padding: "12px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", fontFamily: "'Cairo', sans-serif" }}>
                  <option value="LEVEL_1">المستوى الأول</option>
                  <option value="LEVEL_2">المستوى الثاني</option>
                </select>
              </div>
            )}

            {role === "MANAGEMENT" && (
              <p style={{ color: "#8b949e", fontSize: "0.85rem" }}>سيتم النشر لمستواك: {level === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني"}</p>
            )}
            {role === "TEACHER" && (
              <p style={{ color: "#8b949e", fontSize: "0.85rem" }}>سيتم النشر لمستواك: {level === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني"}</p>
            )}

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleSubmit} disabled={submitting}
              style={{ padding: "14px", background: submitting ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #238636, #2ea043)", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "'Cairo', sans-serif", opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "⏳ جاري النشر..." : "نشر التعميم"}
            </motion.button>

            {message && (
              <p style={{ color: messageType === "success" ? "#2ea043" : "#ff3131", textAlign: "center", fontWeight: 700, fontSize: "1rem" }}>{message}</p>
            )}
          </div>
        </div>
      </main>
      </PageTransition>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";
import { csrfFetch } from "@/lib/csrfClient";

export default function TeacherGradesPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "TEACHER" && role !== "ADMIN") { router.push("/login"); return; }
    fetchSubjects();
    fetchDistributions();
  }, []);

  const fetchSubjects = async () => {
    try {
      const level = localStorage.getItem("userLevel") || "LEVEL_1";
      const res = await fetch(`/api/subjects/active?level=${level}`);
      const data = await res.json();
      if (data.success) setSubjects(data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchDistributions = async () => {
    try {
      const res = await fetch("/api/grades/list?limit=50");
      const data = await res.json();
      if (data.success) setDistributions(data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleUpload = async () => {
    if (!file || !subjectId) {
      setMessage("❌ يرجى اختيار المادة والملف");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subjectId", subjectId);
      const res = await csrfFetch("/api/grades/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setMessage("✅ تم رفع الملف بنجاح، يمكنك الآن توزيع الدرجات");
        setFile(null);
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch {
      setMessage("❌ فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const handleDistribute = async (id: string) => {
    try {
      const res = await csrfFetch("/api/grades/distribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeDistributionId: id }),
      });
      const data = await res.json();
      setMessage(data.success ? "✅ تم توزيع الدرجات، سيصلك إشعار للطلاب" : `❌ ${data.message}`);
    } catch {
      setMessage("❌ فشل التوزيع");
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
          <h1 className="text-2xl font-bold text-white mb-2 text-center">توزيع الدرجات</h1>
          <p className="text-[#8b949e] text-sm mb-8 text-center">رفع ملفات الدرجات وتوزيعها على الطلاب</p>

          {message && (
            <div style={{ ...glassCard, borderColor: "#2ea04344", marginBottom: 20, textAlign: "center" }}>
              <p className="text-white">{message}</p>
            </div>
          )}

          <div style={glassCard} className="mb-6">
            <h2 className="text-lg font-bold text-white mb-4">رفع ملف الدرجات</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[#8b949e] text-sm block mb-2">المادة الدراسية</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "13px 15px",
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    borderRadius: "14px",
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  <option value="">اختر المادة</option>
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[#8b949e] text-sm block mb-2">ملف الدرجات</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept=".pdf,.xlsx,.xls,.docx,.png,.jpg,.jpeg"
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    borderRadius: "14px",
                    fontFamily: "'Cairo', sans-serif",
                  }}
                />
              </div>
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading || !file || !subjectId}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #2188ff, #0066cc)",
                color: "#fff",
                fontWeight: 700,
                fontFamily: "'Cairo', sans-serif",
                cursor: uploading ? "not-allowed" : "pointer",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? "⚡ جاري الرفع..." : "📤 رفع الملف"}
            </button>
          </div>
        </motion.div>
      </div>
      </PageTransition>
    </div>
  );
}

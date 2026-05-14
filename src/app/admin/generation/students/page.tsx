"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PageTransition from "@/components/layout/PageTransition";
import { csrfFetch } from "@/lib/csrfClient";

const glassCard: React.CSSProperties = {
  background: "rgba(13, 17, 23, 0.92)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(0,229,255,0.2)",
  borderRadius: "16px",
};

interface LogEntry {
  id: string;
  name: string;
  email: string | null;
  code: string;
  level: string;
  role: string;
  subjectName: string | null;
  createdAt: string;
  generatedByName: string | null;
}

export default function GenerateStudentsPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState("");
  const [userLevel, setUserLevel] = useState("");
  const [names, setNames] = useState("");
  const [level, setLevel] = useState("LEVEL_1");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const isAdmin = userRole === "ADMIN";

  useEffect(() => {
    const r = localStorage.getItem("userRole") || "";
    const l = localStorage.getItem("userLevel") || "";
    setUserRole(r);
    setUserLevel(l);
    if (r !== "ADMIN" && r !== "MANAGEMENT") { router.push("/login"); return; }
    if (r === "MANAGEMENT") setLevel(l);
  }, []);

  useEffect(() => { if (userRole) fetchLogs(); }, [logPage, logSearch, logFilter, userRole]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({ page: String(logPage), limit: "50" });
      if (logSearch) params.set("search", logSearch);
      if (logFilter) params.set("role", logFilter);
      const res = await fetch(`/api/admin/generation-log?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setTotalLogs(data.total);
      }
    } catch { } finally { setLoadingLogs(false); }
  };

  const handleGenerate = async () => {
    const namesList = names.split("\n").map((n) => n.trim()).filter(Boolean);
    if (!namesList.length) { showToast("الرجاء إدخال اسم واحد على الأقل", "error"); return; }
    if (namesList.length > 500) { showToast("الحد الأقصى 500 اسم", "error"); return; }

    setGenerating(true);
    setProgress(0);

    try {
      const res = await csrfFetch("/api/admin/generate-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: namesList, level }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message, "success");
        setNames("");
        setLogPage(1);
        fetchLogs();
        if (data.data?.length) generateTextFile(data.data);
      } else {
        showToast(data.message || "فشل التوليد", "error");
      }
    } catch {
      showToast("فشل الاتصال بالخادم", "error");
    } finally {
      setGenerating(false);
      setProgress(100);
    }
  };

  const generateTextFile = (entries: any[]) => {
    const lines: string[] = [];
    lines.push("==================================================================");
    lines.push("              سحابة الأمن السيبراني - جامعة ذمار");
    lines.push("                    أكواد تفعيل حسابات الطلاب");
    lines.push("==================================================================");
    lines.push("");
    lines.push(`تاريخ التوليد: ${new Date().toLocaleDateString("ar-YE")}`);
    lines.push(`المستوى: ${level === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني"}`);
    lines.push(`إجمالي الحسابات: ${entries.filter((e: any) => e.success).length}`);
    lines.push("");

    entries.filter((e: any) => e.success).forEach((entry: any) => {
      lines.push("------------------------------------------------------------------");
      lines.push(`الاسم: ${entry.name}`);
      lines.push(`المستوى: ${entry.level === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني"}`);
      lines.push(`كود التفعيل: ${entry.code}`);
      lines.push("");
    });

    lines.push("==================================================================");
    lines.push("              Cybersecurity Cloud - Dhamar University");
    lines.push("==================================================================");

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activation-codes-students-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingle = (entry: LogEntry) => {
    const lines = [
      "==================================================================",
      "              سحابة الأمن السيبراني - جامعة ذمار",
      "                    كود تفعيل الحساب",
      "==================================================================",
      "",
      `الاسم: ${entry.name}`,
      `المستوى: ${entry.level === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني"}`,
      `كود التفعيل: ${entry.code}`,
      "",
      "==================================================================",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code-${entry.name}-${entry.code}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSelected = async () => {
    if (!selectedIds.size) { showToast("الرجاء تحديد حساب واحد على الأقل", "error"); return; }
    try {
      const ids = Array.from(selectedIds).join(",");
      const res = await fetch(`/api/admin/generation-log/export?ids=${ids}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selected-codes-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("فشل تحميل الملف", "error");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === logs.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(logs.map((l) => l.id)));
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim() || editName.length < 2) { showToast("الاسم قصير جداً", "error"); return; }
    try {
      const res = await csrfFetch(`/api/admin/generation-log/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("تم تعديل الاسم بنجاح", "success");
        setEditingId(null);
        fetchLogs();
      } else showToast(data.message, "error");
    } catch {
      showToast("فشل تعديل الاسم", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    try {
      const res = await csrfFetch(`/api/admin/generation-log/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("تم حذف السجل بنجاح", "success");
        fetchLogs();
      } else showToast(data.message, "error");
    } catch {
      showToast("فشل حذف السجل", "error");
    }
  };

  const totalPages = Math.ceil(totalLogs / 50);

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Cairo', sans-serif", color: "#fff" }}>
      <Header />
      <PageTransition>
        <main style={{ paddingTop: "100px", paddingBottom: "80px", maxWidth: "1100px", margin: "0 auto", padding: "100px 20px 80px" }}>

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                style={{
                  position: "fixed", top: "80px", left: "20px", zIndex: 1000,
                  padding: "14px 24px", borderRadius: "12px",
                  background: toast.type === "success" ? "rgba(46,160,67,0.95)" : "rgba(255,49,49,0.95)",
                  color: "#fff", fontWeight: 700, fontSize: "0.95rem",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                  border: `1px solid ${toast.type === "success" ? "#2ea043" : "#ff3131"}`,
                }}
              >
                {toast.type === "success" ? "✅ " : "❌ "}{toast.message}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            style={{ color: "#00e5ff", fontSize: "1.8rem", fontWeight: 800, marginBottom: "5px", textAlign: "center", textShadow: "0 0 20px rgba(0,229,255,0.3)" }}>
            👨‍🎓 توليد حسابات الطلاب
          </motion.h2>
          <p style={{ color: "#8b949e", textAlign: "center", marginBottom: "30px", fontSize: "0.95rem" }}>
            {isAdmin ? "الأدمن - جميع المستويات الدراسية" : `الإدارة - ${userLevel === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني"}`}
          </p>

          {/* قسم الإدخال */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...glassCard, padding: "24px", marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ color: "#8b949e", fontSize: "0.85rem", display: "block", marginBottom: "6px" }}>المستوى الدراسي</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  disabled={!isAdmin}
                  style={{
                    width: "100%", padding: "12px 15px", background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.12)", color: "#fff",
                    borderRadius: "12px", fontSize: "0.95rem", fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  <option value="LEVEL_1">المستوى الأول</option>
                  <option value="LEVEL_2">المستوى الثاني</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <div style={{ color: "#8b949e", fontSize: "0.85rem" }}>
                  <span style={{ color: "#00e5ff", fontWeight: 700 }}>{names.split("\n").filter(n => n.trim()).length}</span> اسم تم إدخالهم
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: "#8b949e", fontSize: "0.85rem", display: "block", marginBottom: "6px" }}>الأسماء (اسم واحد في كل سطر - حتى 500 اسم)</label>
              <textarea
                value={names}
                onChange={(e) => setNames(e.target.value)}
                rows={8}
                placeholder="أدخل أسماء الطلاب، كل اسم في سطر&#10;مثال:&#10;محمد أحمد علي&#10;عمر حسن عبدالله&#10;فاطمة سعيد"
                style={{
                  width: "100%", padding: "13px 15px", background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.12)", color: "#fff",
                  borderRadius: "12px", fontSize: "0.95rem", fontFamily: "'Cairo', sans-serif",
                  resize: "vertical", minHeight: "160px",
                }}
              />
            </div>

            {/* شريط التقدم */}
            <AnimatePresence>
              {generating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginBottom: "16px" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: "#00e5ff", fontSize: "0.85rem", fontWeight: 600 }}>⚡ جاري التوليد...</span>
                    <span style={{ color: "#8b949e", fontSize: "0.8rem" }}>{progress}%</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "10px", height: "8px", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                      style={{
                        height: "100%",
                        background: "linear-gradient(90deg, #00e5ff, #bf5af2)",
                        borderRadius: "10px",
                        boxShadow: "0 0 15px rgba(0,229,255,0.3)",
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={handleGenerate}
              disabled={generating || !names.trim()}
              whileHover={!generating && names.trim() ? { scale: 1.02 } : {}}
              whileTap={!generating && names.trim() ? { scale: 0.98 } : {}}
              style={{
                width: "100%", padding: "14px", border: "none", borderRadius: "14px",
                background: generating ? "linear-gradient(135deg, #1a1a2e, #16213e)" : "linear-gradient(135deg, #238636, #2ea043)",
                color: "#fff", fontWeight: 700, fontSize: "1rem",
                fontFamily: "'Cairo', sans-serif",
                cursor: generating || !names.trim() ? "not-allowed" : "pointer",
                opacity: generating || !names.trim() ? 0.6 : 1,
                boxShadow: generating ? "none" : "0 0 20px rgba(46,160,67,0.2)",
                transition: "all 0.3s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
            >
              {generating ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⚡</span>
                  جاري التوليد...
                </>
              ) : (
                <>
                  🚀 توليد الحسابات
                </>
              )}
            </motion.button>
          </motion.div>

          {/* سجل التوليد */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ ...glassCard, padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <h3 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700 }}>
                📋 سجل التوليد <span style={{ color: "#8b949e", fontSize: "0.85rem" }}>({totalLogs})</span>
              </h3>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="🔍 بحث بالاسم..."
                  value={logSearch}
                  onChange={(e) => { setLogSearch(e.target.value); setLogPage(1); }}
                  style={{
                    padding: "8px 14px", background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.1)", color: "#fff",
                    borderRadius: "10px", fontSize: "0.85rem", fontFamily: "'Cairo', sans-serif",
                    width: "180px",
                  }}
                />
                <select
                  value={logFilter}
                  onChange={(e) => { setLogFilter(e.target.value); setLogPage(1); }}
                  style={{
                    padding: "8px 14px", background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.1)", color: "#fff",
                    borderRadius: "10px", fontSize: "0.85rem", fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  <option value="">جميع الأنواع</option>
                  <option value="STUDENT">طلاب</option>
                  <option value="TEACHER">معلمين</option>
                  <option value="MANAGEMENT">إدارة</option>
                </select>
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleDownloadSelected}
                    style={{
                      padding: "8px 16px", background: "rgba(0,229,255,0.15)",
                      border: "1px solid rgba(0,229,255,0.3)", color: "#00e5ff",
                      borderRadius: "10px", cursor: "pointer", fontWeight: 600,
                      fontSize: "0.85rem", fontFamily: "'Cairo', sans-serif",
                    }}
                  >
                    📥 تحميل المحدد ({selectedIds.size})
                  </button>
                )}
              </div>
            </div>

            {loadingLogs ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#8b949e" }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ fontSize: "2rem", marginBottom: "10px" }}>⚡</motion.div>
                جاري تحميل السجل...
              </div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#8b949e" }}>
                <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📭</div>
                لا توجد حسابات مولدة بعد
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "10px" }}>
                  <button
                    onClick={toggleSelectAll}
                    style={{
                      padding: "6px 14px", background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)", color: "#8b949e",
                      borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem",
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  >
                    {selectedIds.size === logs.length ? "❌ إلغاء تحديد الكل" : "✅ تحديد الكل"}
                  </button>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <th style={{ padding: "10px 8px", color: "#8b949e", textAlign: "center", width: "40px" }}></th>
                        <th style={{ padding: "10px 8px", color: "#8b949e", textAlign: "right" }}>#</th>
                        <th style={{ padding: "10px 8px", color: "#8b949e", textAlign: "right" }}>الاسم</th>
                        <th style={{ padding: "10px 8px", color: "#8b949e", textAlign: "center" }}>المستوى</th>
                        <th style={{ padding: "10px 8px", color: "#8b949e", textAlign: "center" }}>النوع</th>
                        <th style={{ padding: "10px 8px", color: "#8b949e", textAlign: "center" }}>كود التفعيل</th>
                        <th style={{ padding: "10px 8px", color: "#8b949e", textAlign: "center" }}>التاريخ</th>
                        <th style={{ padding: "10px 8px", color: "#8b949e", textAlign: "center" }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((entry, index) => (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                        >
                          <td style={{ padding: "10px 8px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(entry.id)}
                              onChange={() => toggleSelect(entry.id)}
                              style={{ cursor: "pointer", accentColor: "#00e5ff" }}
                            />
                          </td>
                          <td style={{ padding: "10px 8px", color: "#8b949e", fontSize: "0.8rem" }}>{(logPage - 1) * 50 + index + 1}</td>
                          <td style={{ padding: "10px 8px", color: "#fff" }}>
                            {editingId === entry.id ? (
                              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  style={{
                                    padding: "4px 8px", background: "rgba(0,0,0,0.5)",
                                    border: "1px solid rgba(0,229,255,0.3)", color: "#fff",
                                    borderRadius: "6px", fontSize: "0.8rem", fontFamily: "'Cairo', sans-serif",
                                    width: "140px",
                                  }}
                                  autoFocus
                                />
                                <button onClick={() => handleEdit(entry.id)}
                                  style={{ padding: "4px 8px", background: "rgba(0,229,255,0.15)", border: "none", borderRadius: "6px", color: "#00e5ff", cursor: "pointer", fontSize: "0.75rem", fontFamily: "'Cairo', sans-serif" }}
                                >حفظ</button>
                                <button onClick={() => { setEditingId(null); }}
                                  style={{ padding: "4px 8px", background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "6px", color: "#8b949e", cursor: "pointer", fontSize: "0.75rem", fontFamily: "'Cairo', sans-serif" }}
                                >إلغاء</button>
                              </div>
                            ) : (
                              entry.name
                            )}
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "center" }}>
                            <span style={{
                              padding: "2px 8px", borderRadius: "6px",
                              background: entry.level === "LEVEL_1" ? "rgba(0,229,255,0.1)" : "rgba(191,90,242,0.1)",
                              color: entry.level === "LEVEL_1" ? "#00e5ff" : "#bf5af2",
                              fontSize: "0.75rem",
                            }}>
                              {entry.level === "LEVEL_1" ? "L1" : "L2"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "center" }}>
                            <span style={{
                              padding: "2px 8px", borderRadius: "6px",
                              background: entry.role === "STUDENT" ? "rgba(46,160,67,0.15)" : entry.role === "TEACHER" ? "rgba(191,90,242,0.15)" : "rgba(255,202,40,0.15)",
                              color: entry.role === "STUDENT" ? "#2ea043" : entry.role === "TEACHER" ? "#bf5af2" : "#ffca28",
                              fontSize: "0.75rem",
                            }}>
                              {entry.role === "STUDENT" ? "طالب" : entry.role === "TEACHER" ? "معلم" : "إدارة"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "center" }}>
                            <span style={{
                              padding: "3px 10px", borderRadius: "6px",
                              background: "rgba(0,229,255,0.08)",
                              color: "#00e5ff", fontSize: "0.8rem",
                              fontFamily: "'Orbitron', monospace", direction: "ltr",
                              display: "inline-block",
                            }}>
                              {entry.code}
                            </span>
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "center", color: "#8b949e", fontSize: "0.75rem" }}>
                            {new Date(entry.createdAt).toLocaleDateString("ar-YE")}
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                              <button onClick={() => handleDownloadSingle(entry)}
                                title="تحميل"
                                style={{ padding: "4px 8px", background: "rgba(0,229,255,0.1)", border: "none", borderRadius: "6px", color: "#00e5ff", cursor: "pointer", fontSize: "0.8rem" }}
                              >📥</button>
                              <button onClick={() => { setEditingId(entry.id); setEditName(entry.name); }}
                                title="تعديل"
                                style={{ padding: "4px 8px", background: "rgba(255,202,40,0.1)", border: "none", borderRadius: "6px", color: "#ffca28", cursor: "pointer", fontSize: "0.8rem" }}
                              >✏️</button>
                              <button onClick={() => handleDelete(entry.id)}
                                title="حذف"
                                style={{ padding: "4px 8px", background: "rgba(255,49,49,0.1)", border: "none", borderRadius: "6px", color: "#ff3131", cursor: "pointer", fontSize: "0.8rem" }}
                              >🗑️</button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "20px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                      disabled={logPage <= 1}
                      style={{
                        padding: "8px 16px", background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)", color: logPage <= 1 ? "#484f58" : "#8b949e",
                        borderRadius: "8px", cursor: logPage <= 1 ? "not-allowed" : "pointer",
                        fontSize: "0.85rem", fontFamily: "'Cairo', sans-serif",
                      }}
                    >السابق</button>
                    <span style={{ padding: "8px 12px", color: "#8b949e", fontSize: "0.85rem" }}>
                      {logPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setLogPage((p) => Math.min(totalPages, p + 1))}
                      disabled={logPage >= totalPages}
                      style={{
                        padding: "8px 16px", background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)", color: logPage >= totalPages ? "#484f58" : "#8b949e",
                        borderRadius: "8px", cursor: logPage >= totalPages ? "not-allowed" : "pointer",
                        fontSize: "0.85rem", fontFamily: "'Cairo', sans-serif",
                      }}
                    >التالي</button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </main>
      </PageTransition>
      <Footer />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";

type Tab = "inbox" | "history" | "grades";

interface Subject {
  id: string;
  name: string;
  code: string;
  level: string;
}

interface StudentInfo {
  id: string;
  name: string;
  email: string;
}

interface Assignment {
  id: string;
  status: string;
  grade?: number;
  feedback?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  evaluatedAt?: string;
  student: StudentInfo;
  subject: Subject;
}

interface PaginatedResponse {
  success: boolean;
  data: Assignment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: "inbox", label: "التكاليف الواردة", icon: "📥" },
  { key: "history", label: "التقييمات السابقة", icon: "📋" },
  { key: "grades", label: "توزيع الدرجات", icon: "📊" },
];

const glassCard: React.CSSProperties = {
  background: "rgba(13, 17, 23, 0.92)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(0,229,255,0.2)",
  borderRadius: "16px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  background: "rgba(0,0,0,0.5)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  borderRadius: "12px",
  fontSize: "0.95rem",
  textAlign: "center",
  fontFamily: "'Cairo', sans-serif",
  outline: "none",
};

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("inbox");

  const [pending, setPending] = useState<Assignment[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPages, setPendingPages] = useState(0);
  const [loadingPending, setLoadingPending] = useState(false);

  const [history, setHistory] = useState<Assignment[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPages, setHistoryPages] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [evaluatedCount, setEvaluatedCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);

  const [evalModal, setEvalModal] = useState<Assignment | null>(null);
  const [evalGrade, setEvalGrade] = useState("");
  const [evalFeedback, setEvalFeedback] = useState("");
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState("");

  const [gradeFile, setGradeFile] = useState<File | null>(null);
  const [gradeSubject, setGradeSubject] = useState("");
  const [gradeUploading, setGradeUploading] = useState(false);
  const [gradeMsg, setGradeMsg] = useState("");

  const [toasts, setToasts] = useState<{ id: string; msg: string; type: string }[]>([]);

  const LIMIT = 20;

  const showToast = (msg: string, type: string = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  useEffect(() => {
    const level = localStorage.getItem("userLevel") || "LEVEL_1";
    fetch(`/api/subjects/active?level=${level}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSubjects(res.data);
      })
      .catch(() => {});
  }, []);

  const fetchPending = async (page: number) => {
    setLoadingPending(true);
    try {
      const res = await fetch(`/api/assignments/pending?page=${page}&limit=${LIMIT}`);
      const data: PaginatedResponse = await res.json();
      if (data.success) {
        setPending(data.data);
        setPendingTotal(data.total);
        setPendingPages(data.totalPages);
      }
    } catch {
      showToast("فشل تحميل التكاليف", "error");
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchHistory = async (page: number) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/assignments/history?page=${page}&limit=${LIMIT}`);
      const data: PaginatedResponse = await res.json();
      if (data.success) {
        setHistory(data.data);
        setHistoryTotal(data.total);
        setHistoryPages(data.totalPages);
      }
    } catch {
      showToast("فشل تحميل التقييمات", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "inbox") fetchPending(pendingPage);
  }, [activeTab, pendingPage]);

  useEffect(() => {
    if (activeTab === "history") fetchHistory(historyPage);
  }, [activeTab, historyPage]);

  useEffect(() => {
    const level = localStorage.getItem("userLevel") || "LEVEL_1";
    Promise.all([
      fetch(`/api/assignments/pending?page=1&limit=1`).then((r) => r.json()),
      fetch(`/api/assignments/history?page=1&limit=1`).then((r) => r.json()),
      fetch(`/api/subjects/active?level=${level}`).then((r) => r.json()),
    ])
      .then(([pendRes, histRes]) => {
        if (pendRes.success) setPendingCount(pendRes.total);
        if (histRes.success) setEvaluatedCount(histRes.total);
        setStudentsCount(0);
      })
      .catch(() => {});
  }, []);

  const handleEvaluate = async () => {
    if (!evalModal) return;
    const grade = parseInt(evalGrade);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      setEvalError("الدرجة يجب أن تكون بين 0 و 100");
      return;
    }
    setEvalLoading(true);
    setEvalError("");
    try {
      const res = await fetch("/api/assignments/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: evalModal.id, grade, feedback: evalFeedback || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("تم تقييم التكليف بنجاح");
        setEvalModal(null);
        setEvalGrade("");
        setEvalFeedback("");
        fetchPending(pendingPage);
        setPendingCount((c) => Math.max(0, c - 1));
        setEvaluatedCount((c) => c + 1);
      } else {
        setEvalError(data.message || "فشل التقييم");
      }
    } catch {
      setEvalError("حدث خطأ في الاتصال");
    } finally {
      setEvalLoading(false);
    }
  };

  const handleGradeUpload = async () => {
    if (!gradeFile || !gradeSubject) {
      setGradeMsg("يرجى اختيار ملف والمادة");
      return;
    }
    setGradeUploading(true);
    setGradeMsg("");
    try {
      const fd = new FormData();
      fd.append("file", gradeFile);
      fd.append("subjectId", gradeSubject);
      const res = await fetch("/api/grades/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        showToast("تم رفع توزيع الدرجات بنجاح");
        setGradeFile(null);
        setGradeSubject("");
      } else {
        setGradeMsg(data.message || "فشل الرفع");
      }
    } catch {
      setGradeMsg("حدث خطأ في الرفع");
    } finally {
      setGradeUploading(false);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#010204",
        fontFamily: "'Cairo', sans-serif",
        color: "#fff",
      }}
    >
      <Header />
      <Sidebar />

      <PageTransition>
      <main
        style={{
          padding: "100px 20px 80px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            color: "#00e5ff",
            fontSize: "2rem",
            fontWeight: 800,
            marginBottom: "30px",
            textAlign: "center",
            textShadow: "0 0 20px rgba(0,229,255,0.3)",
          }}
        >
          👨‍🏫 لوحة تحكم المعلم
        </motion.h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "30px",
          }}
        >
          {[
            { label: "تكاليف معلقة", value: pendingCount, icon: "📥", color: "#ffca28" },
            { label: "تم تقييمها", value: evaluatedCount, icon: "✅", color: "#2ea043" },
            { label: "الطلاب المسجلين", value: studentsCount, icon: "👥", color: "#00e5ff" },
            { label: "المواد", value: subjects.length, icon: "📚", color: "#a371f7" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{ ...glassCard, padding: "20px", textAlign: "center" }}
            >
              <div style={{ fontSize: "2.2rem", marginBottom: "8px" }}>{stat.icon}</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ color: "#8b949e", fontSize: "0.9rem" }}>{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "24px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {tabs.map((tab) => (
            <motion.button
              key={tab.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setActiveTab(tab.key); }}
              style={{
                padding: "12px 24px",
                borderRadius: "12px",
                border: activeTab === tab.key
                  ? "1px solid rgba(0,229,255,0.5)"
                  : "1px solid rgba(255,255,255,0.1)",
                background: activeTab === tab.key
                  ? "rgba(0,229,255,0.12)"
                  : "rgba(255,255,255,0.03)",
                color: activeTab === tab.key ? "#00e5ff" : "#8b949e",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontFamily: "'Cairo', sans-serif",
                fontWeight: activeTab === tab.key ? 700 : 400,
                transition: "all 0.2s",
              }}
            >
              {tab.icon} {tab.label}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "inbox" && (
            <motion.div
              key="inbox"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {loadingPending ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#8b949e" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "10px" }}>⏳</div>
                  جاري التحميل...
                </div>
              ) : pending.length === 0 ? (
                <div style={{ ...glassCard, padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📭</div>
                  <p style={{ color: "#8b949e", fontSize: "1.1rem" }}>لا توجد تكاليف معلقة</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {pending.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      style={{
                        ...glassCard,
                        padding: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: "200px" }}>
                        <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#e6edf3" }}>
                          {item.student.name}
                        </div>
                        <div style={{ color: "#00e5ff", fontSize: "0.85rem" }}>
                          {item.subject.name} ({item.subject.code})
                        </div>
                        <div style={{ color: "#8b949e", fontSize: "0.8rem", marginTop: "4px" }}>
                          {formatDate(item.createdAt)}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {item.fileUrl && (
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: "8px 16px",
                              borderRadius: "10px",
                              background: "rgba(0,229,255,0.1)",
                              border: "1px solid rgba(0,229,255,0.3)",
                              color: "#00e5ff",
                              textDecoration: "none",
                              fontSize: "0.85rem",
                            }}
                          >
                            📎 الملف
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setEvalModal(item);
                            setEvalGrade("");
                            setEvalFeedback("");
                            setEvalError("");
                          }}
                          style={{
                            padding: "8px 20px",
                            borderRadius: "10px",
                            border: "none",
                            background: "linear-gradient(135deg, #238636, #2ea043)",
                            color: "#fff",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "'Cairo', sans-serif",
                            fontSize: "0.85rem",
                          }}
                        >
                          تقييم
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  {renderPagination(pendingPage, pendingPages, setPendingPage)}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {loadingHistory ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#8b949e" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "10px" }}>⏳</div>
                  جاري التحميل...
                </div>
              ) : history.length === 0 ? (
                <div style={{ ...glassCard, padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📭</div>
                  <p style={{ color: "#8b949e", fontSize: "1.1rem" }}>لا توجد تقييمات سابقة</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {history.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      style={{
                        ...glassCard,
                        padding: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: "200px" }}>
                        <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#e6edf3" }}>
                          {item.student.name}
                        </div>
                        <div style={{ color: "#00e5ff", fontSize: "0.85rem" }}>
                          {item.subject.name} ({item.subject.code})
                        </div>
                        <div style={{ color: "#8b949e", fontSize: "0.8rem", marginTop: "4px" }}>
                          تقييم: {formatDate(item.evaluatedAt || item.createdAt)}
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: "center",
                          padding: "8px 20px",
                          borderRadius: "10px",
                          background: item.grade !== undefined && item.grade >= 50
                            ? "rgba(46,160,67,0.15)"
                            : "rgba(248,81,73,0.15)",
                          border: item.grade !== undefined && item.grade >= 50
                            ? "1px solid rgba(46,160,67,0.4)"
                            : "1px solid rgba(248,81,73,0.4)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "1.3rem",
                            fontWeight: 800,
                            color: item.grade !== undefined && item.grade >= 50 ? "#2ea043" : "#f85149",
                          }}
                        >
                          {item.grade ?? "—"}
                        </div>
                        <div style={{ color: "#8b949e", fontSize: "0.75rem" }}>درجة</div>
                      </div>
                      {item.feedback && (
                        <div
                          style={{
                            width: "100%",
                            color: "#8b949e",
                            fontSize: "0.85rem",
                            padding: "8px",
                            background: "rgba(255,255,255,0.03)",
                            borderRadius: "8px",
                          }}
                        >
                          💬 {item.feedback}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {renderPagination(historyPage, historyPages, setHistoryPage)}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "grades" && (
            <motion.div
              key="grades"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div style={{ ...glassCard, padding: "30px", maxWidth: "600px", margin: "0 auto" }}>
                <h3
                  style={{
                    color: "#00e5ff",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    marginBottom: "20px",
                    textAlign: "center",
                  }}
                >
                  📤 رفع ملف توزيع الدرجات
                </h3>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", color: "#8b949e", marginBottom: "6px", textAlign: "center" }}>
                    اختر المادة
                  </label>
                  <select
                    value={gradeSubject}
                    onChange={(e) => setGradeSubject(e.target.value)}
                    style={{
                      ...inputStyle,
                      cursor: "pointer",
                      appearance: "none",
                    }}
                  >
                    <option value="">-- اختر المادة --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", color: "#8b949e", marginBottom: "6px", textAlign: "center" }}>
                    اختر ملف (Excel/PDF)
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.pdf,.csv"
                    onChange={(e) => setGradeFile(e.target.files?.[0] || null)}
                    style={{
                      ...inputStyle,
                      padding: "10px",
                      textAlign: "center",
                    }}
                  />
                </div>

                {gradeMsg && (
                  <div
                    style={{
                      textAlign: "center",
                      color: gradeMsg.includes("نجاح") ? "#2ea043" : "#f85149",
                      fontSize: "0.9rem",
                      marginBottom: "12px",
                    }}
                  >
                    {gradeMsg}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGradeUpload}
                  disabled={gradeUploading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    border: "none",
                    background: "linear-gradient(135deg, #238636, #2ea043)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "1rem",
                    cursor: "pointer",
                    fontFamily: "'Cairo', sans-serif",
                    opacity: gradeUploading ? 0.6 : 1,
                  }}
                >
                  {gradeUploading ? "⏳ جاري الرفع..." : "🚀 رفع الملف"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </PageTransition>

      <AnimatePresence>
        {evalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              padding: "20px",
            }}
            onClick={() => setEvalModal(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...glassCard,
                padding: "30px",
                width: "100%",
                maxWidth: "480px",
              }}
            >
              <h3
                style={{
                  color: "#00e5ff",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  marginBottom: "6px",
                  textAlign: "center",
                }}
              >
                📝 تقييم التكليف
              </h3>
              <p style={{ color: "#8b949e", textAlign: "center", fontSize: "0.9rem", marginBottom: "20px" }}>
                {evalModal.student.name} - {evalModal.subject.name}
              </p>

              {evalError && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#f85149",
                    background: "rgba(248,81,73,0.1)",
                    border: "1px solid rgba(248,81,73,0.3)",
                    padding: "10px",
                    borderRadius: "10px",
                    marginBottom: "16px",
                    fontSize: "0.9rem",
                  }}
                >
                  {evalError}
                </div>
              )}

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: "#8b949e", marginBottom: "6px", textAlign: "center" }}>
                  الدرجة (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={evalGrade}
                  onChange={(e) => setEvalGrade(e.target.value)}
                  style={inputStyle}
                  placeholder="مثال: 85"
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", color: "#8b949e", marginBottom: "6px", textAlign: "center" }}>
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: "80px",
                    textAlign: "right",
                  }}
                  placeholder="أضف ملاحظاتك هنا..."
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setEvalModal(null)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "transparent",
                    color: "#8b949e",
                    cursor: "pointer",
                    fontFamily: "'Cairo', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                  }}
                >
                  إلغاء
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEvaluate}
                  disabled={evalLoading}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #238636, #2ea043)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: "0.9rem",
                    opacity: evalLoading ? 0.6 : 1,
                  }}
                >
                  {evalLoading ? "⏳..." : "✅ حفظ التقييم"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          position: "fixed",
          top: "90px",
          left: "20px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              style={{
                background: t.type === "error"
                  ? "rgba(248,81,73,0.2)"
                  : "rgba(46,160,67,0.2)",
                backdropFilter: "blur(15px)",
                border: t.type === "error"
                  ? "1px solid #f85149"
                  : "1px solid #2ea043",
                borderRadius: "12px",
                padding: "14px 20px",
                color: "#fff",
                fontFamily: "'Cairo', sans-serif",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                minWidth: "280px",
                maxWidth: "400px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              }}
            >
              <span>{t.type === "error" ? "❌" : "✅"}</span>
              <span>{t.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <footer
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "8px",
          textAlign: "center",
          background: "rgba(2, 4, 8, 0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(0, 229, 255, 0.15)",
          fontSize: "clamp(0.65rem, 1.3vw, 0.8rem)",
          color: "#bbb",
        }}
      >
        <div>
          تطوير وإشراف:{" "}
          <span style={{ color: "#00e5ff", fontWeight: "bold" }}>
            محمد إبراهيم الديلمي | أحمد الهيدمة
          </span>
        </div>
        <div
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.65rem",
            opacity: 0.6,
            marginTop: "3px",
          }}
        >
          OFFICIAL CYBER SECURITY PLATFORM - DHAMAR UNIVERSITY &copy; 2026
        </div>
      </footer>
    </div>
  );

  function renderPagination(
    page: number,
    totalPages: number,
    setPage: (p: number) => void
  ) {
    if (totalPages <= 1) return null;
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px",
          marginTop: "16px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
            color: page === 1 ? "#555" : "#00e5ff",
            cursor: page === 1 ? "not-allowed" : "pointer",
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          → السابق
        </button>
        <span style={{ color: "#8b949e", fontSize: "0.9rem" }}>
          {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
            color: page === totalPages ? "#555" : "#00e5ff",
            cursor: page === totalPages ? "not-allowed" : "pointer",
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          التالي ←
        </button>
      </div>
    );
  }
}

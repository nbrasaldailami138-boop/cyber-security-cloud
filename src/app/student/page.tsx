"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Assignment {
  id: string;
  subject: { id: string; name: string; code: string };
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: string;
  grade: number | null;
  feedback: string | null;
  createdAt: string;
  evaluatedAt: string | null;
}

interface Grade {
  id: string;
  subjectName: string;
  grade: number;
  feedback: string | null;
  evaluatorName: string | null;
  evaluatedAt: string;
}

const glassCard = {
  background: "rgba(13, 17, 23, 0.92)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(0, 229, 255, 0.2)",
  borderRadius: "16px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 20px",
  background: "rgba(0,0,0,0.5)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  color: "#fff",
  fontSize: "1rem",
  fontFamily: "'Cairo', sans-serif",
  outline: "none",
  transition: "border-color 0.3s",
  textAlign: "center",
  boxSizing: "border-box",
};

const tabs = ["رفع تكليف", "تكاليفي", "درجاتي"];

export default function StudentDashboard() {
  const [userLevel, setUserLevel] = useState("LEVEL_1");
  const [activeTab, setActiveTab] = useState(0);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [assignmentsTotalPages, setAssignmentsTotalPages] = useState(1);

  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradesLoading, setGradesLoading] = useState(true);
  const [gradesPage, setGradesPage] = useState(1);
  const [gradesTotalPages, setGradesTotalPages] = useState(1);

  const [stats, setStats] = useState({ total: 0, evaluated: 0, subjects: 0 });

  useEffect(() => {
    const level = localStorage.getItem("userLevel") || "LEVEL_1";
    setUserLevel(level);
  }, []);

  useEffect(() => {
    if (!userLevel) return;
    fetch(`/api/subjects/active?level=${userLevel}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSubjects(res.data);
      })
      .catch(() => {});
  }, [userLevel]);

  useEffect(() => {
    fetchAssignments();
  }, [assignmentsPage]);

  useEffect(() => {
    fetchGrades();
  }, [gradesPage]);

  useEffect(() => {
    computeStats();
  }, [assignments, grades]);

  async function fetchAssignments() {
    setAssignmentsLoading(true);
    try {
      const r = await fetch(`/api/assignments/list?page=${assignmentsPage}&limit=20`);
      const res = await r.json();
      if (res.success) {
        setAssignments(res.data);
        setAssignmentsTotalPages(res.totalPages || 1);
      }
    } catch {}
    setAssignmentsLoading(false);
  }

  async function fetchGrades() {
    setGradesLoading(true);
    try {
      const r = await fetch(`/api/grades/list?page=${gradesPage}&limit=20`);
      const res = await r.json();
      if (res.success) {
        setGrades(res.data);
        setGradesTotalPages(res.totalPages || 1);
      }
    } catch {}
    setGradesLoading(false);
  }

  function computeStats() {
    const total = assignments.length;
    let evaluated = 0;
    const subjectSet = new Set<string>();
    assignments.forEach((a) => {
      if (a.status === "evaluated") evaluated++;
      subjectSet.add(a.subject.name);
    });
    setStats({ total, evaluated, subjects: subjectSet.size || subjects.length });
  }

  async function handleUpload() {
    if (!selectedFile || !selectedSubject) {
      setUploadMessage("يرجى اختيار المادة والملف");
      return;
    }
    setUploading(true);
    setUploadMessage("");
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("subjectId", selectedSubject);
      const r = await fetch("/api/assignments/upload", { method: "POST", body: fd });
      const res = await r.json();
      if (res.success) {
        setUploadMessage("✅ " + res.message);
        setSelectedFile(null);
        setSelectedSubject("");
        fetchAssignments();
      } else {
        setUploadMessage("❌ " + res.message);
      }
    } catch {
      setUploadMessage("❌ حدث خطأ أثناء رفع التكليف");
    }
    setUploading(false);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

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
          paddingTop: "100px",
          paddingBottom: "80px",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "100px 20px 80px",
        }}
      >
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            color: "#00e5ff",
            fontSize: "2rem",
            fontWeight: 800,
            marginBottom: "10px",
            textAlign: "center",
          }}
        >
          🎓 لوحة الطالب
        </motion.h2>
        <p style={{ color: "#8b949e", textAlign: "center", marginBottom: "30px" }}>
          مرحباً بك في سحابة الأمن السيبراني
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "30px",
          }}
        >
          <div style={glassCard as React.CSSProperties}>
            <div style={{ padding: "25px", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📤</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#00e5ff" }}>
                {stats.total}
              </div>
              <div style={{ color: "#8b949e" }}>إجمالي التكليفات</div>
            </div>
          </div>
          <div style={glassCard as React.CSSProperties}>
            <div style={{ padding: "25px", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>✅</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#2ea043" }}>
                {stats.evaluated}
              </div>
              <div style={{ color: "#8b949e" }}>تم التقييم</div>
            </div>
          </div>
          <div style={glassCard as React.CSSProperties}>
            <div style={{ padding: "25px", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📚</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#ffca28" }}>
                {stats.subjects}
              </div>
              <div style={{ color: "#8b949e" }}>المواد النشطة</div>
            </div>
          </div>
        </motion.div>

        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "24px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "12px",
            padding: "4px",
            direction: "rtl",
          }}
        >
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "none",
                borderRadius: "10px",
                background: activeTab === i
                  ? "linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.05))"
                  : "transparent",
                color: activeTab === i ? "#00e5ff" : "#8b949e",
                fontSize: "0.95rem",
                fontWeight: activeTab === i ? 700 : 500,
                fontFamily: "'Cairo', sans-serif",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 0 && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              style={glassCard as React.CSSProperties}
            >
              <div style={{ padding: "30px" }}>
                <h3
                  style={{
                    color: "#00e5ff",
                    fontSize: "1.3rem",
                    fontWeight: 700,
                    marginBottom: "24px",
                    textAlign: "center",
                  }}
                >
                  📤 رفع تكليف جديد
                </h3>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      color: "#8b949e",
                      marginBottom: "8px",
                      textAlign: "center",
                    }}
                  >
                    اختر المادة
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">-- اختر المادة --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      color: "#8b949e",
                      marginBottom: "8px",
                      textAlign: "center",
                    }}
                  >
                    اختر ملف التكليف
                  </label>
                  <div
                    style={{
                      ...inputStyle,
                      padding: "10px 20px",
                      cursor: "pointer",
                    }}
                    onClick={() => document.getElementById("fileInput")?.click()}
                  >
                    {selectedFile ? selectedFile.name : "اضغط لاختيار ملف"}
                  </div>
                  <input
                    id="fileInput"
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: "none",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #00e5ff, #007bff)",
                    color: "#fff",
                    fontSize: "1rem",
                    fontWeight: 700,
                    fontFamily: "'Cairo', sans-serif",
                    cursor: uploading ? "not-allowed" : "pointer",
                    opacity: uploading ? 0.6 : 1,
                    boxShadow: "0 0 20px rgba(0,229,255,0.3)",
                    transition: "all 0.3s",
                  }}
                >
                  {uploading ? "جاري الرفع..." : "🚀 رفع التكليف"}
                </button>

                {uploadMessage && (
                  <p
                    style={{
                      marginTop: "16px",
                      textAlign: "center",
                      color: uploadMessage.includes("❌") ? "#ff3131" : "#2ea043",
                      fontWeight: 600,
                    }}
                  >
                    {uploadMessage}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 1 && (
            <motion.div
              key="assignments"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              style={glassCard as React.CSSProperties}
            >
              <div style={{ padding: "30px" }}>
                <h3
                  style={{
                    color: "#00e5ff",
                    fontSize: "1.3rem",
                    fontWeight: 700,
                    marginBottom: "20px",
                    textAlign: "center",
                  }}
                >
                  📋 تكاليفي
                </h3>

                {assignmentsLoading ? (
                  <p style={{ textAlign: "center", color: "#8b949e" }}>جاري التحميل...</p>
                ) : assignments.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📭</div>
                    <p style={{ color: "#8b949e" }}>لا توجد تكاليف بعد</p>
                    <p style={{ color: "#555", fontSize: "0.85rem" }}>
                      ابدأ برفع أول تكليف لك
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "0.9rem",
                          minWidth: "600px",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.08)",
                              color: "#8b949e",
                            }}
                          >
                            <th style={{ padding: "12px 8px", textAlign: "center" }}>المادة</th>
                            <th style={{ padding: "12px 8px", textAlign: "center" }}>الملف</th>
                            <th style={{ padding: "12px 8px", textAlign: "center" }}>الحجم</th>
                            <th style={{ padding: "12px 8px", textAlign: "center" }}>الحالة</th>
                            <th style={{ padding: "12px 8px", textAlign: "center" }}>الدرجة</th>
                            <th style={{ padding: "12px 8px", textAlign: "center" }}>التاريخ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignments.map((a, i) => (
                            <motion.tr
                              key={a.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              style={{
                                borderBottom: "1px solid rgba(255,255,255,0.04)",
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px 8px",
                                  textAlign: "center",
                                  color: "#e6edf3",
                                }}
                              >
                                {a.subject.name}
                              </td>
                              <td style={{ padding: "12px 8px", textAlign: "center" }}>
                                <a
                                  href={a.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: "#00e5ff",
                                    textDecoration: "none",
                                    fontSize: "0.85rem",
                                  }}
                                >
                                  {a.fileName}
                                </a>
                              </td>
                              <td
                                style={{
                                  padding: "12px 8px",
                                  textAlign: "center",
                                  color: "#8b949e",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {formatSize(a.fileSize)}
                              </td>
                              <td style={{ padding: "12px 8px", textAlign: "center" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "4px 12px",
                                    borderRadius: "20px",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    background:
                                      a.status === "evaluated"
                                        ? "rgba(46,160,67,0.15)"
                                        : "rgba(255,202,40,0.15)",
                                    color:
                                      a.status === "evaluated"
                                        ? "#2ea043"
                                        : "#ffca28",
                                  }}
                                >
                                  {a.status === "evaluated" ? "تم التقييم" : "قيد الانتظار"}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "12px 8px",
                                  textAlign: "center",
                                  color:
                                    a.grade !== null && a.grade !== undefined
                                      ? "#2ea043"
                                      : "#8b949e",
                                  fontWeight: 700,
                                }}
                              >
                                {a.grade !== null && a.grade !== undefined ? a.grade : "—"}
                              </td>
                              <td
                                style={{
                                  padding: "12px 8px",
                                  textAlign: "center",
                                  color: "#8b949e",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {formatDate(a.createdAt)}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {assignmentsTotalPages > 1 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "8px",
                          marginTop: "20px",
                        }}
                      >
                        <button
                          onClick={() =>
                            setAssignmentsPage((p) => Math.max(1, p - 1))
                          }
                          disabled={assignmentsPage === 1}
                          style={{
                            padding: "8px 16px",
                            border: "1px solid rgba(0,229,255,0.3)",
                            borderRadius: "8px",
                            background: "rgba(0,229,255,0.1)",
                            color: "#00e5ff",
                            fontFamily: "'Cairo', sans-serif",
                            cursor: assignmentsPage === 1 ? "not-allowed" : "pointer",
                            opacity: assignmentsPage === 1 ? 0.4 : 1,
                          }}
                        >
                          السابق
                        </button>
                        <span
                          style={{
                            padding: "8px 16px",
                            color: "#8b949e",
                          }}
                        >
                          {assignmentsPage} / {assignmentsTotalPages}
                        </span>
                        <button
                          onClick={() =>
                            setAssignmentsPage((p) =>
                              Math.min(assignmentsTotalPages, p + 1)
                            )
                          }
                          disabled={assignmentsPage === assignmentsTotalPages}
                          style={{
                            padding: "8px 16px",
                            border: "1px solid rgba(0,229,255,0.3)",
                            borderRadius: "8px",
                            background: "rgba(0,229,255,0.1)",
                            color: "#00e5ff",
                            fontFamily: "'Cairo', sans-serif",
                            cursor:
                              assignmentsPage === assignmentsTotalPages
                                ? "not-allowed"
                                : "pointer",
                            opacity:
                              assignmentsPage === assignmentsTotalPages ? 0.4 : 1,
                          }}
                        >
                          التالي
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 2 && (
            <motion.div
              key="grades"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              style={glassCard as React.CSSProperties}
            >
              <div style={{ padding: "30px" }}>
                <h3
                  style={{
                    color: "#00e5ff",
                    fontSize: "1.3rem",
                    fontWeight: 700,
                    marginBottom: "20px",
                    textAlign: "center",
                  }}
                >
                  📊 درجاتي
                </h3>

                {gradesLoading ? (
                  <p style={{ textAlign: "center", color: "#8b949e" }}>جاري التحميل...</p>
                ) : grades.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📭</div>
                    <p style={{ color: "#8b949e" }}>لا توجد درجات بعد</p>
                    <p style={{ color: "#555", fontSize: "0.85rem" }}>
                      سيتم عرض الدرجات بعد تقييم التكليفات
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "0.9rem",
                          minWidth: "600px",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.08)",
                              color: "#8b949e",
                            }}
                          >
                            <th style={{ padding: "12px 8px", textAlign: "center" }}>المادة</th>
                            <th style={{ padding: "12px 8px", textAlign: "center" }}>الدرجة</th>
                            <th style={{ padding: "12px 8px", textAlign: "center" }}>الملاحظات</th>
                            <th style={{ padding: "12px 8px", textAlign: "center" }}>المقيم</th>
                            <th style={{ padding: "12px 8px", textAlign: "center" }}>تاريخ التقييم</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grades.map((g, i) => (
                            <motion.tr
                              key={g.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              style={{
                                borderBottom: "1px solid rgba(255,255,255,0.04)",
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px 8px",
                                  textAlign: "center",
                                  color: "#e6edf3",
                                }}
                              >
                                {g.subjectName}
                              </td>
                              <td
                                style={{
                                  padding: "12px 8px",
                                  textAlign: "center",
                                  fontWeight: 800,
                                  fontSize: "1.1rem",
                                  color:
                                    g.grade >= 80
                                      ? "#2ea043"
                                      : g.grade >= 50
                                        ? "#ffca28"
                                        : "#ff3131",
                                }}
                              >
                                {g.grade}
                              </td>
                              <td
                                style={{
                                  padding: "12px 8px",
                                  textAlign: "center",
                                  color: "#8b949e",
                                  fontSize: "0.85rem",
                                  maxWidth: "200px",
                                }}
                              >
                                {g.feedback || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "12px 8px",
                                  textAlign: "center",
                                  color: "#8b949e",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {g.evaluatorName || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "12px 8px",
                                  textAlign: "center",
                                  color: "#8b949e",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {formatDate(g.evaluatedAt)}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {gradesTotalPages > 1 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "8px",
                          marginTop: "20px",
                        }}
                      >
                        <button
                          onClick={() =>
                            setGradesPage((p) => Math.max(1, p - 1))
                          }
                          disabled={gradesPage === 1}
                          style={{
                            padding: "8px 16px",
                            border: "1px solid rgba(0,229,255,0.3)",
                            borderRadius: "8px",
                            background: "rgba(0,229,255,0.1)",
                            color: "#00e5ff",
                            fontFamily: "'Cairo', sans-serif",
                            cursor: gradesPage === 1 ? "not-allowed" : "pointer",
                            opacity: gradesPage === 1 ? 0.4 : 1,
                          }}
                        >
                          السابق
                        </button>
                        <span
                          style={{
                            padding: "8px 16px",
                            color: "#8b949e",
                          }}
                        >
                          {gradesPage} / {gradesTotalPages}
                        </span>
                        <button
                          onClick={() =>
                            setGradesPage((p) =>
                              Math.min(gradesTotalPages, p + 1)
                            )
                          }
                          disabled={gradesPage === gradesTotalPages}
                          style={{
                            padding: "8px 16px",
                            border: "1px solid rgba(0,229,255,0.3)",
                            borderRadius: "8px",
                            background: "rgba(0,229,255,0.1)",
                            color: "#00e5ff",
                            fontFamily: "'Cairo', sans-serif",
                            cursor:
                              gradesPage === gradesTotalPages
                                ? "not-allowed"
                                : "pointer",
                            opacity:
                              gradesPage === gradesTotalPages ? 0.4 : 1,
                          }}
                        >
                          التالي
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </PageTransition>
      <Footer />
    </div>
  );
}

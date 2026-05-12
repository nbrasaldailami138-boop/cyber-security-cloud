"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PageTransition from "@/components/layout/PageTransition";

export default function GenerationPage() {
  const [names, setNames] = useState("");
  const [level, setLevel] = useState("LEVEL_1");
  const [role, setRole] = useState("STUDENT");
  const [subjectName, setSubjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!names.trim()) {
      setError("يرجى إدخال اسم واحد على الأقل");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const namesArray = names
        .split("\n")
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      const res = await fetch("/api/admin/generate-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          names: namesArray,
          level,
          role,
          subjectName: role === "TEACHER" ? subjectName : undefined,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setResults(data.data);
      } else {
        setError(data.message || "فشل التوليد");
      }
    } catch (err: any) {
      setError("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) return;

    let csv = "الاسم,البريد الإلكتروني,كود التفعيل,الرتبة,المستوى\n";
    results.forEach((r) => {
      if (!r.error) {
        csv += `${r.name},${r.email},${r.code},${r.role},${r.level}\n`;
      }
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activation-codes-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

      <PageTransition>
      <main
        style={{
          paddingTop: "100px",
          paddingBottom: "80px",
          maxWidth: "900px",
          margin: "0 auto",
          padding: "100px 20px 80px",
        }}
      >
        <div
          style={{
            background: "rgba(10, 20, 40, 0.5)",
            backdropFilter: "blur(25px)",
            border: "1px solid rgba(0, 229, 255, 0.2)",
            borderRadius: "20px",
            padding: "30px",
          }}
        >
          <h2
            style={{
              color: "#00e5ff",
              fontSize: "1.5rem",
              fontWeight: 800,
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            🏗️ إدارة التوليد
          </h2>

          {/* اختيار الرتبة */}
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                color: "#8b949e",
                marginBottom: "5px",
                display: "block",
              }}
            >
              نوع الحساب
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                color: "#fff",
                fontFamily: "'Cairo', sans-serif",
                fontSize: "0.95rem",
              }}
            >
              <option value="STUDENT">طالب</option>
              <option value="TEACHER">معلم</option>
              <option value="MANAGEMENT">إدارة</option>
            </select>
          </div>

          {/* اختيار المستوى */}
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                color: "#8b949e",
                marginBottom: "5px",
                display: "block",
              }}
            >
              المستوى الدراسي
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                color: "#fff",
                fontFamily: "'Cairo', sans-serif",
                fontSize: "0.95rem",
              }}
            >
              <option value="LEVEL_1">المستوى الأول</option>
              <option value="LEVEL_2">المستوى الثاني</option>
            </select>
          </div>

          {/* اسم المادة (للمعلم فقط) */}
          {role === "TEACHER" && (
            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  color: "#8b949e",
                  marginBottom: "5px",
                  display: "block",
                }}
              >
                اسم المادة
              </label>
              <input
                type="text"
                placeholder="مثلاً: أمن الشبكات"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                  color: "#fff",
                  fontFamily: "'Cairo', sans-serif",
                  fontSize: "0.95rem",
                  textAlign: "center",
                }}
              />
            </div>
          )}

          {/* حقل الأسماء */}
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                color: "#8b949e",
                marginBottom: "5px",
                display: "block",
              }}
            >
              الأسماء (اسم واحد في كل سطر)
            </label>
            <textarea
              placeholder={`أحمد محمد\nفاطمة علي\nعمر سالم\n...`}
              value={names}
              onChange={(e) => setNames(e.target.value)}
              rows={8}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                color: "#fff",
                fontFamily: "'Cairo', sans-serif",
                fontSize: "0.95rem",
                textAlign: "right",
                resize: "vertical",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                background: "rgba(248, 81, 73, 0.1)",
                border: "1px solid #f85149",
                color: "#f85149",
                padding: "12px",
                borderRadius: "12px",
                marginBottom: "15px",
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, #238636, #2ea043)",
              color: "#fff",
              border: "none",
              borderRadius: "14px",
              fontWeight: 800,
              fontSize: "1.1rem",
              cursor: "pointer",
              fontFamily: "'Cairo', sans-serif",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "⏳ جاري التوليد..." : "توليد الحسابات"}
          </button>

          {/* عرض النتائج */}
          {results.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <h3 style={{ color: "#00e5ff", fontSize: "1.1rem" }}>
                  ✅ تم توليد {results.filter((r) => !r.error).length} حساب
                </h3>
                <button
                  onClick={handleExport}
                  style={{
                    padding: "8px 16px",
                    background: "rgba(0,229,255,0.1)",
                    border: "1px solid #00e5ff",
                    borderRadius: "8px",
                    color: "#00e5ff",
                    cursor: "pointer",
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: "0.85rem",
                  }}
                >
                  📥 تصدير CSV
                </button>
              </div>

              <div style={{ maxHeight: "300px", overflow: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.85rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <th
                        style={{
                          padding: "8px",
                          color: "#8b949e",
                          textAlign: "right",
                        }}
                      >
                        الاسم
                      </th>
                      <th
                        style={{
                          padding: "8px",
                          color: "#8b949e",
                          textAlign: "right",
                        }}
                      >
                        كود التفعيل
                      </th>
                      <th
                        style={{
                          padding: "8px",
                          color: "#8b949e",
                          textAlign: "right",
                        }}
                      >
                        الحالة
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <td style={{ padding: "8px" }}>{r.name}</td>
                        <td
                          style={{
                            padding: "8px",
                            fontFamily: "'Orbitron', monospace",
                            color: "#00e5ff",
                            direction: "ltr",
                            textAlign: "right",
                          }}
                        >
                          {r.error ? "❌" : r.code}
                        </td>
                        <td style={{ padding: "8px" }}>
                          {r.error ? (
                            <span style={{ color: "#f85149" }}>فشل</span>
                          ) : (
                            <span style={{ color: "#2ea043" }}>✅</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      </PageTransition>

      <Footer />
    </div>
  );
}

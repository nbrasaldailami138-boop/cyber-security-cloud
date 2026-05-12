"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import { useToast } from "@/components/ui/Toast";
import PageTransition from "@/components/layout/PageTransition";

interface ContentItem {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  fileSize: number;
  level: string;
  createdAt: string;
  publisher: { name: string; role: string };
  subject?: { name: string };
}

export default function LibraryPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadContent();
  }, [filter]);

  const loadContent = async () => {
    try {
      const params = new URLSearchParams();
      if (filter) params.set("type", filter);
      const res = await fetch(`/api/library/content?${params}`);
      const data = await res.json();
      if (data.success) setContent(data.data);
    } catch (err) {}
  };

  const handleUpload = async () => {
    if (!title || !file) {
      showToast("يرجى إدخال العنوان واختيار ملف", "warning");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append(
        "type",
        file.name.split(".").pop()?.toUpperCase() || "PDF",
      );

      const res = await fetch("/api/library/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        showToast("تم رفع الملف بنجاح", "success");
        setShowUpload(false);
        setTitle("");
        setFile(null);
        loadContent();
      } else {
        showToast(data.message, "error");
      }
    } catch (err) {
      showToast("فشل الرفع", "error");
    } finally {
      setUploading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "PDF":
        return "📄";
      case "DOCX":
        return "📝";
      case "XLSX":
        return "📊";
      case "PNG":
      case "JPG":
        return "🖼️";
      case "YOUTUBE_LINK":
        return "▶️";
      default:
        return "📁";
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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
          paddingTop: "90px",
          paddingBottom: "60px",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "100px 20px 60px",
        }}
      >
        {/* هيدر المكتبة */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "25px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <h2 style={{ color: "#00e5ff", fontSize: "1.8rem", fontWeight: 800 }}>
            📚 المكتبة التعليمية
          </h2>
          <button
            onClick={() => setShowUpload(!showUpload)}
            style={{
              padding: "10px 20px",
              background: "rgba(0,229,255,0.1)",
              border: "1px solid #00e5ff",
              borderRadius: "10px",
              color: "#00e5ff",
              cursor: "pointer",
              fontFamily: "'Cairo', sans-serif",
              fontWeight: 700,
            }}
          >
            {showUpload ? "إلغاء" : "📤 نشر محتوى"}
          </button>
        </div>

        {/* نافذة الرفع */}
        {showUpload && (
          <div
            style={{
              background: "rgba(10,20,40,0.6)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0,229,255,0.2)",
              borderRadius: "16px",
              padding: "25px",
              marginBottom: "20px",
            }}
          >
            <input
              type="text"
              placeholder="عنوان المحتوى"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#fff",
                fontFamily: "'Cairo', sans-serif",
                marginBottom: "10px",
              }}
            />
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#fff",
                fontFamily: "'Cairo', sans-serif",
                marginBottom: "10px",
              }}
            />
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                width: "100%",
                padding: "12px",
                background: "linear-gradient(135deg, #238636, #2ea043)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Cairo', sans-serif",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? "⏳ جاري الرفع..." : "رفع الملف"}
            </button>
          </div>
        )}

        {/* فلاتر */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          {["", "PDF", "DOCX", "XLSX", "PNG", "JPG", "YOUTUBE_LINK"].map(
            (t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border:
                    filter === t
                      ? "1px solid #00e5ff"
                      : "1px solid rgba(255,255,255,0.1)",
                  background:
                    filter === t ? "rgba(0,229,255,0.1)" : "transparent",
                  color: filter === t ? "#00e5ff" : "#8b949e",
                  cursor: "pointer",
                  fontFamily: "'Cairo', sans-serif",
                  fontSize: "0.85rem",
                }}
              >
                {t || "الكل"}
              </button>
            ),
          )}
        </div>

        {/* الشبكة */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {content.map((item) => (
            <div
              key={item.id}
              style={{
                background: "rgba(22,27,34,0.6)",
                backdropFilter: "blur(15px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                padding: "20px",
                transition: "all 0.3s",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>
                {getTypeIcon(item.type)}
              </div>
              <h3
                style={{
                  fontWeight: 700,
                  marginBottom: "8px",
                  fontSize: "1rem",
                }}
              >
                {item.title}
              </h3>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "#8b949e",
                    background: "rgba(255,255,255,0.05)",
                    padding: "3px 8px",
                    borderRadius: "20px",
                  }}
                >
                  {item.type}
                </span>
                {item.subject && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "#bf5af2",
                      background: "rgba(191,90,242,0.1)",
                      padding: "3px 8px",
                      borderRadius: "20px",
                    }}
                  >
                    {item.subject.name}
                  </span>
                )}
                <span style={{ fontSize: "0.7rem", color: "#8b949e" }}>
                  {formatSize(item.fileSize)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "10px",
                }}
              >
                <span style={{ fontSize: "0.7rem", color: "#8b949e" }}>
                  {item.publisher.name} •{" "}
                  {new Date(item.createdAt).toLocaleDateString("ar-YE")}
                </span>
                <a
                  href={item.fileUrl}
                  target="_blank"
                  style={{
                    padding: "8px 16px",
                    background: "rgba(0,229,255,0.1)",
                    border: "1px solid rgba(0,229,255,0.3)",
                    borderRadius: "8px",
                    color: "#00e5ff",
                    textDecoration: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  تحميل
                </a>
              </div>
            </div>
          ))}
        </div>

        {content.length === 0 && (
          <p
            style={{
              textAlign: "center",
              color: "#8b949e",
              marginTop: "50px",
              fontSize: "1.1rem",
            }}
          >
            📭 لا يوجد محتوى في المكتبة حالياً
          </p>
        )}
      </main>
      </PageTransition>

      <Footer />
    </div>
  );
}

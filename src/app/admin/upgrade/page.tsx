"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import { useToast } from "@/components/ui/Toast";
import PageTransition from "@/components/layout/PageTransition";
import { csrfFetch } from "@/lib/csrfClient";

export default function UpgradePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleUpgrade = async () => {
    if (!email) return showToast("أدخل البريد الإلكتروني", "warning");
    setLoading(true);
    try {
      const res = await csrfFetch("/api/admin/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) showToast("تمت ترقية المستخدم", "success");
      else showToast(data.message, "error");
    } catch {
      showToast("فشل الاتصال", "error");
    } finally {
      setLoading(false);
    }
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
          padding: "100px 20px 60px",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            color: "#00e5ff",
            fontSize: "1.8rem",
            fontWeight: 800,
            marginBottom: "25px",
          }}
        >
          ⬆️ ترقية المستخدمين
        </h2>
        <div
          style={{
            background: "rgba(10,20,40,0.6)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0,229,255,0.2)",
            borderRadius: "16px",
            padding: "25px",
          }}
        >
          <label
            style={{ color: "#8b949e", marginBottom: "8px", display: "block" }}
          >
            البريد الإلكتروني للمستخدم
          </label>
          <input
            type="email"
            placeholder="user@cybersec.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "#fff",
              fontFamily: "'Cairo', sans-serif",
              marginBottom: "15px",
              textAlign: "center",
            }}
          />
          <button
            onClick={handleUpgrade}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "linear-gradient(135deg, #7a00ff, #bf5af2)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Cairo', sans-serif",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "⏳" : "منح صلاحية النشر"}
          </button>
        </div>
      </main>
      </PageTransition>
      <Footer />
    </div>
  );
}

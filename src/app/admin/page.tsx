"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";
export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, activated: 0, pending: 0 });

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
        <h2
          style={{
            color: "#00e5ff",
            fontSize: "2rem",
            fontWeight: 800,
            marginBottom: "30px",
            textAlign: "center",
          }}
        >
          🛡️ لوحة تحكم الأدمن
        </h2>

        {/* بطاقات إحصائية */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              background: "rgba(10,20,40,0.5)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0,229,255,0.2)",
              borderRadius: "16px",
              padding: "25px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>👥</div>
            <div
              style={{ fontSize: "2rem", fontWeight: 800, color: "#00e5ff" }}
            >
              {stats.users}
            </div>
            <div style={{ color: "#8b949e" }}>إجمالي المستخدمين</div>
          </div>
          <div
            style={{
              background: "rgba(10,20,40,0.5)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0,229,255,0.2)",
              borderRadius: "16px",
              padding: "25px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>✅</div>
            <div
              style={{ fontSize: "2rem", fontWeight: 800, color: "#2ea043" }}
            >
              {stats.activated}
            </div>
            <div style={{ color: "#8b949e" }}>حسابات مفعلة</div>
          </div>
          <div
            style={{
              background: "rgba(10,20,40,0.5)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0,229,255,0.2)",
              borderRadius: "16px",
              padding: "25px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>⏳</div>
            <div
              style={{ fontSize: "2rem", fontWeight: 800, color: "#ffca28" }}
            >
              {stats.pending}
            </div>
            <div style={{ color: "#8b949e" }}>حسابات معلقة</div>
          </div>
        </div>

        {/* اختصارات سريعة */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "15px",
          }}
        >
          <a
            href="/admin/generation"
            style={{
              background: "rgba(0,229,255,0.1)",
              border: "1px solid rgba(0,229,255,0.3)",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              color: "#00e5ff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            🏗️ إدارة التوليد
          </a>
          <a
            href="/admin/activated-accounts"
            style={{
              background: "rgba(0,229,255,0.1)",
              border: "1px solid rgba(0,229,255,0.3)",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              color: "#00e5ff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            📋 الحسابات المفعلة
          </a>
          <a
            href="/admin/audit-log"
            style={{
              background: "rgba(0,229,255,0.1)",
              border: "1px solid rgba(0,229,255,0.3)",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              color: "#00e5ff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            📜 سجل العمليات
          </a>
          <a
            href="/admin/security-radar"
            style={{
              background: "rgba(0,229,255,0.1)",
              border: "1px solid rgba(0,229,255,0.3)",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              color: "#00e5ff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            🛡️ رادار الأمان
          </a>
        </div>
      </main>
      </PageTransition>
      <Footer />
    </div>
  );
}

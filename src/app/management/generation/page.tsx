"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";

const glassCard: React.CSSProperties = {
  background: "rgba(13, 17, 23, 0.92)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(0,229,255,0.2)",
  borderRadius: "16px",
};

export default function ManagementGenerationPage() {
  const router = useRouter();
  const [userLevel, setUserLevel] = useState("");

  useEffect(() => {
    const r = localStorage.getItem("userRole");
    const l = localStorage.getItem("userLevel") || "";
    setUserLevel(l);
    if (r !== "MANAGEMENT" && r !== "ADMIN") { router.push("/login"); return; }
  }, []);

  const sections = [
    {
      id: "students",
      icon: "👨‍🎓",
      title: "توليد حسابات الطلاب",
      desc: "إدخال أسماء الطلاب وتوليد أكواد التفعيل مع سجل كامل",
      color: "#00e5ff",
      href: "/admin/generation/students",
    },
    {
      id: "subjects",
      icon: "📚",
      title: "توليد المواد الدراسية",
      desc: "إضافة مواد دراسية مع توليد حسابات المعلمين وأكواد التفعيل",
      color: "#bf5af2",
      href: "/admin/generation/subjects",
    },
  ];

  const levelLabel = userLevel === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني";

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Cairo', sans-serif", color: "#fff" }}>
      <Header />
      <Sidebar />
      <PageTransition>
        <main style={{ paddingTop: "100px", paddingBottom: "80px", maxWidth: "1000px", margin: "0 auto", padding: "100px 20px 80px" }}>
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ color: "#00e5ff", fontSize: "2rem", fontWeight: 800, marginBottom: "10px", textAlign: "center", textShadow: "0 0 20px rgba(0,229,255,0.3)" }}
          >
            🏗️ إدارة التوليد
          </motion.h2>
          <p style={{ color: "#8b949e", textAlign: "center", marginBottom: "40px", fontSize: "1rem" }}>
            الإدارة - {levelLabel}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {sections.map((section, i) => (
              <motion.button
                key={section.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.03, y: -6 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(section.href)}
                style={{
                  ...glassCard,
                  padding: "35px 25px",
                  cursor: "pointer",
                  textAlign: "center",
                  border: `1px solid ${section.color}33`,
                  transition: "all 0.3s",
                }}
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{ fontSize: "3.5rem", marginBottom: "16px" }}
                >
                  {section.icon}
                </motion.div>
                <h3 style={{ color: section.color, fontSize: "1.3rem", fontWeight: 800, marginBottom: "8px" }}>{section.title}</h3>
                <p style={{ color: "#8b949e", fontSize: "0.9rem", lineHeight: 1.6 }}>{section.desc}</p>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "60%" }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                  style={{
                    height: "3px",
                    background: `linear-gradient(90deg, transparent, ${section.color}, transparent)`,
                    margin: "15px auto 0",
                    borderRadius: "2px",
                  }}
                />
              </motion.button>
            ))}
          </div>
        </main>
      </PageTransition>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PageTransition from "@/components/layout/PageTransition";

const glassCard: React.CSSProperties = {
  background: "rgba(13, 17, 23, 0.92)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(0,229,255,0.2)",
  borderRadius: "16px",
};

export default function GenerationHub() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>("");
  const [userLevel, setUserLevel] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole") || "");
    setUserLevel(localStorage.getItem("userLevel") || "");
    setMounted(true);
  }, []);

  const isAdmin = userRole === "ADMIN";

  const sections = [
    {
      id: "students",
      icon: "👨‍🎓",
      title: "توليد حسابات الطلاب",
      desc: "إدخال أسماء الطلاب وتوليد أكواد التفعيل مع سجل كامل",
      color: "#00e5ff",
      href: "/admin/generation/students",
      allowed: true,
    },
    {
      id: "subjects",
      icon: "📚",
      title: "توليد المواد الدراسية",
      desc: "إضافة مواد دراسية مع توليد حسابات المعلمين وأكواد التفعيل",
      color: "#bf5af2",
      href: "/admin/generation/subjects",
      allowed: true,
    },
    {
      id: "management",
      icon: "👔",
      title: "توليد حسابات الإدارة",
      desc: "توليد حسابات إدارة للمستويات الدراسية مع أكواد التفعيل",
      color: "#ffca28",
      href: "/admin/generation/management",
      allowed: isAdmin,
    },
  ];

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Cairo', sans-serif", color: "#fff" }}>
      <Header />
      <PageTransition>
        <main style={{ position: "relative", zIndex: 1, paddingTop: "100px", paddingBottom: "80px", maxWidth: "1000px", margin: "0 auto", padding: "100px 20px 80px" }}>
          {/* شريط الأدمن العلوي - أيقونات سريعة */}
          {mounted && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "16px",
                marginBottom: "40px",
                flexWrap: "wrap",
              }}
            >
              {sections.filter((s) => s.allowed).map((section) => (
                <motion.button
                  key={section.id}
                  whileHover={{ scale: 1.08, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push(section.href)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "14px 28px",
                    background: `linear-gradient(135deg, ${section.color}22, transparent)`,
                    border: `1px solid ${section.color}44`,
                    borderRadius: "14px",
                    color: section.color,
                    fontSize: "1rem",
                    fontWeight: 700,
                    fontFamily: "'Cairo', sans-serif",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    boxShadow: `0 0 20px ${section.color}11`,
                  }}
                >
                  <span style={{ fontSize: "1.8rem" }}>{section.icon}</span>
                  <span>{section.title}</span>
                  <span style={{
                    background: `${section.color}22`,
                    padding: "2px 8px",
                    borderRadius: "20px",
                    fontSize: "0.7rem",
                    color: section.color,
                  }}>
                    {isAdmin ? "الأدمن" : userLevel === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني"}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}

          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ color: "#00e5ff", fontSize: "2rem", fontWeight: 800, marginBottom: "10px", textAlign: "center", textShadow: "0 0 20px rgba(0,229,255,0.3)" }}
          >
            🏗️ إدارة التوليد
          </motion.h2>
          <p style={{ color: "#8b949e", textAlign: "center", marginBottom: "40px", fontSize: "1rem" }}>
            {isAdmin ? "الأدمن - جميع المستويات" : `الإدارة - ${userLevel === "LEVEL_1" ? "المستوى الأول" : "المستوى الثاني"}`}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {sections
              .filter((s) => s.allowed)
              .map((section, i) => (
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
      <Footer />
    </div>
  );
}

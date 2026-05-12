"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  level: string;
  status: string;
  isActivated: boolean;
  createdAt: string;
}

export default function ActivatedAccountsPage() {
  const [users, setUsers] = useState<UserItem[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) setUsers(data.data.users);
    } catch (err) {}
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "#ff3131";
      case "MANAGEMENT":
        return "#ffca28";
      case "TEACHER":
        return "#bf5af2";
      default:
        return "#00e5ff";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "أدمن";
      case "MANAGEMENT":
        return "إدارة";
      case "TEACHER":
        return "معلم";
      default:
        return "طالب";
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
          maxWidth: "1200px",
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
          ✅ الحسابات المفعلة
        </h2>

        <div style={{ display: "grid", gap: "15px" }}>
          {users
            .filter((u) => u.isActivated)
            .map((user) => (
              <div
                key={user.id}
                style={{
                  background: "rgba(22,27,34,0.6)",
                  backdropFilter: "blur(15px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "15px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <span style={{ fontWeight: 700 }}>{user.name}</span>
                  <span
                    style={{
                      color: "#8b949e",
                      fontSize: "0.8rem",
                      marginRight: "10px",
                    }}
                  >
                    {user.email}
                  </span>
                </div>
                <div
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  <span
                    style={{
                      color: getRoleColor(user.role),
                      fontSize: "0.75rem",
                      background: "rgba(255,255,255,0.05)",
                      padding: "4px 10px",
                      borderRadius: "20px",
                    }}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                  <span style={{ color: "#8b949e", fontSize: "0.75rem" }}>
                    {user.level === "LEVEL_1" ? "المستوى ١" : "المستوى ٢"}
                  </span>
                  <span style={{ color: "#2ea043", fontSize: "0.75rem" }}>
                    ✅
                  </span>
                </div>
              </div>
            ))}
        </div>
      </main>
      </PageTransition>
      <Footer />
    </div>
  );
}

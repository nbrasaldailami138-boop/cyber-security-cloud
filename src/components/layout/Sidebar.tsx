"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface MenuItem {
  label: string;
  icon: string;
  path: string;
  roles: string[];
}

const allMenuItems: MenuItem[] = [
  {
    label: "الرئيسية",
    icon: "🏠",
    path: "/dashboard",
    roles: ["ADMIN", "MANAGEMENT", "TEACHER", "STUDENT"],
  },
  {
    label: "سجل الإشعارات",
    icon: "🔔",
    path: "/notifications",
    roles: ["ADMIN", "MANAGEMENT", "TEACHER", "STUDENT"],
  },
  {
    label: "المكتبة التعليمية",
    icon: "📚",
    path: "/library",
    roles: ["ADMIN", "MANAGEMENT", "TEACHER", "STUDENT"],
  },
  {
    label: "المحادثة",
    icon: "💬",
    path: "/chat",
    roles: ["ADMIN", "MANAGEMENT", "TEACHER", "STUDENT"],
  },
  {
    label: "إدارة التوليد",
    icon: "🏗️",
    path: "/admin/generation",
    roles: ["ADMIN", "MANAGEMENT"],
  },
  {
    label: "سجل العمليات",
    icon: "📜",
    path: "/admin/audit-log",
    roles: ["ADMIN", "TEACHER"],
  },
  {
    label: "ترقية المستخدمين",
    icon: "⬆️",
    path: "/admin/upgrade",
    roles: ["ADMIN", "MANAGEMENT"],
  },
  {
    label: "استهلاك السيرفر",
    icon: "📊",
    path: "/admin/server-usage",
    roles: ["ADMIN", "MANAGEMENT"],
  },
  {
    label: "حسابات مفعلة",
    icon: "✅",
    path: "/admin/activated-accounts",
    roles: ["ADMIN", "MANAGEMENT"],
  },
  {
    label: "رادار الأخطاء",
    icon: "🛡️",
    path: "/admin/security-radar",
    roles: ["ADMIN"],
  },
  {
    label: "إدارة الترم",
    icon: "📅",
    path: "/admin/semester",
    roles: ["ADMIN"],
  },
  {
    label: "ترقية المستويات",
    icon: "🎓",
    path: "/admin/promotions",
    roles: ["ADMIN"],
  },
  {
    label: "نشر تعميم",
    icon: "📢",
    path: "/announcements/create",
    roles: ["ADMIN", "MANAGEMENT", "TEACHER"],
  },
  {
    label: "توزيع الدرجات",
    icon: "📝",
    path: "/teacher/grades",
    roles: ["TEACHER"],
  },
  {
    label: "إعدادات الحساب",
    icon: "⚙️",
    path: "/settings",
    roles: ["ADMIN", "MANAGEMENT", "TEACHER", "STUDENT"],
  },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("STUDENT");
  const [userLevel, setUserLevel] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const role = localStorage.getItem("userRole") || "STUDENT";
    const level = localStorage.getItem("userLevel") || "";
    setUserRole(role);
    setUserLevel(level);
  }, []);

  const getRoleLabel = () => {
    switch (userRole) {
      case "ADMIN": return "الأدمن";
      case "MANAGEMENT": return "الإدارة";
      case "TEACHER": return "معلم";
      default: return "طالب";
    }
  };

  const getLevelLabel = () => {
    if (userLevel === "LEVEL_1") return "المستوى الأول";
    if (userLevel === "LEVEL_2") return "المستوى الثاني";
    return "";
  };

  const filteredMenu = allMenuItems.filter((item) =>
    item.roles.includes(userRole),
  );

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("userRole");
    localStorage.removeItem("userLevel");
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          top: "80px",
          right: "15px",
          zIndex: 150,
          width: "45px",
          height: "45px",
          borderRadius: "12px",
          background: "rgba(0,229,255,0.15)",
          border: "1px solid rgba(0,229,255,0.3)",
          color: "#00e5ff",
          fontSize: "1.5rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(10px)",
        }}
      >
        {isOpen ? "✕" : "☰"}
      </button>

      <div
        style={{
          position: "fixed",
          top: 0,
          right: isOpen ? 0 : "-280px",
          width: "280px",
          height: "100vh",
          zIndex: 140,
          background: "rgba(13, 17, 23, 0.98)",
          backdropFilter: "blur(25px)",
          borderLeft: "1px solid rgba(0, 229, 255, 0.15)",
          transition: "right 0.3s ease",
          display: "flex",
          flexDirection: "column",
          padding: "90px 0 20px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "0 20px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            marginBottom: "10px",
          }}
        >
          <p style={{ color: "#00e5ff", fontWeight: 700, fontSize: "1rem" }}>
            {getRoleLabel()}
          </p>
          {getLevelLabel() && (
            <p style={{ color: "#8b949e", fontSize: "0.8rem" }}>
              {getLevelLabel()}
            </p>
          )}
          <p style={{ color: "#8b949e", fontSize: "0.75rem" }}>
            سحابة الأمن السيبراني
          </p>
        </div>

        <nav style={{ flex: 1, padding: "0 10px" }}>
          {filteredMenu.map((item, index) => {
            const isActive = pathname === item.path ||
              (item.path !== "/dashboard" && pathname.startsWith(item.path));
            return (
              <button
                key={index}
                onClick={() => {
                  router.push(item.path);
                  setIsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  width: "100%",
                  padding: "12px 15px",
                  marginBottom: "4px",
                  borderRadius: "10px",
                  border: "none",
                  background: isActive ? "rgba(0,229,255,0.1)" : "transparent",
                  color: isActive ? "#00e5ff" : "#8b949e",
                  fontSize: "0.9rem",
                  fontFamily: "'Cairo', sans-serif",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "right",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.color = "#e6edf3";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#8b949e";
                  }
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div
          style={{
            padding: "10px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              padding: "12px 15px",
              borderRadius: "10px",
              border: "none",
              background: "transparent",
              color: "#ff3131",
              fontSize: "0.9rem",
              fontFamily: "'Cairo', sans-serif",
              cursor: "pointer",
              textAlign: "right",
            }}
          >
            <span>🚪</span>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 130,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(5px)",
          }}
        />
      )}
    </>
  );
}

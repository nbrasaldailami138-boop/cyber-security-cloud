"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import { useToast } from "@/components/ui/Toast";
import PageTransition from "@/components/layout/PageTransition";
import Pagination from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { useAuthStore } from "@/store/authStore";
import { csrfFetch } from "@/lib/csrfClient";

// ==================== الأنواع ====================
interface SearchUser {
  id: string;
  name: string;
  email: string;
  role: string;
  level: string;
  managementLevel?: string;
}

interface PromotionRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  level: string;
  type: string;
  grantedAt: string;
  grantedBy: string;
}

// ==================== الأيقونات ====================
const BackIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const SearchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const DeleteIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// ==================== المكوّن الرئيسي ====================
export default function PromotionsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { showToast } = useToast();

  const userRole = user?.role || "";
  const userLevel = user?.level || "";
  const userId = user?.id || "";

  // التبويبات
  type ViewTab = "permissions" | "management" | "levels";
  const [viewTab, setViewTab] = useState<ViewTab>("permissions");

  // البحث
  const [searchLevel, setSearchLevel] = useState(
    userRole === "MANAGEMENT" ? userLevel : "",
  );
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);

  // سجل المرقّين
  const [promotedUsers, setPromotedUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(true);

  // نافذة الترقية
  const [grantModal, setGrantModal] = useState<SearchUser | null>(null);
  const [granting, setGranting] = useState(false);

  // طلبات ترقية المستويات
  const [levelRequests, setLevelRequests] = useState<any[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(
    new Set(),
  );

  const pag = usePagination(1, 20);

  // ==================== تحميل المستخدمين المرقّين ====================
  const [allUsers, setAllUsers] = useState<SearchUser[]>([]);

  const loadPromotedUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users?limit=200&level=${searchLevel || ""}`,
      );
      const data = await res.json();
      if (data.success) {
        const all = (data.data || []) as SearchUser[];
        setAllUsers(all);
        const promoted = all.filter(
          (u: any) => u.uploadPermissions?.length > 0 || u.managementLevel,
        );
        setPromotedUsers(promoted);
      }
    } catch {
      /* صامت */
    } finally {
      setLoading(false);
    }
  }, [searchLevel]);

  // ==================== تحميل طلبات ترقية المستويات ====================
  const loadLevelRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/promotion/list?status=PENDING&limit=100");
      const data = await res.json();
      if (data.success) setLevelRequests(data.data || []);
    } catch {
      /* صامت */
    }
  }, []);

  useEffect(() => {
    loadPromotedUsers();
    loadLevelRequests();
  }, [loadPromotedUsers, loadLevelRequests]);

  // ==================== بحث عن مستخدم ====================
  const searchUsers = async () => {
    if (!searchName.trim()) {
      showToast("أدخل اسم المستخدم للبحث", "warning");
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams();
      params.set("search", searchName.trim());
      if (userRole === "ADMIN" && searchLevel) params.set("level", searchLevel);
      if (userRole === "MANAGEMENT") params.set("level", userLevel);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data || []);
      else showToast("لم يتم العثور على نتائج", "warning");
    } catch {
      showToast("فشل البحث", "error");
    } finally {
      setSearching(false);
    }
  };

  // ==================== منح صلاحية نشر ====================
  const handleGrantPermission = async (targetUser: SearchUser) => {
    setGrantModal(targetUser);
  };

  const executeGrantPermission = async () => {
    if (!grantModal) return;
    setGranting(true);
    try {
      const res = await csrfFetch("/api/admin/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: grantModal.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🎉 تم منح ${grantModal.name} صلاحية النشر`, "success");
        setGrantModal(null);
        setSearchResults([]);
        setSearchName("");
        loadPromotedUsers();
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("فشل الاتصال", "error");
    } finally {
      setGranting(false);
    }
  };

  // ==================== ترقية إلى إدارة ====================
  const handleGrantManagement = async (targetUser: SearchUser) => {
    if (!searchLevel && userRole !== "MANAGEMENT") {
      showToast("يرجى تحديد المستوى أولاً", "warning");
      return;
    }
    const level = userRole === "MANAGEMENT" ? userLevel : searchLevel;
    setGranting(true);
    try {
      const res = await csrfFetch("/api/admin/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUser.id, managementLevel: level }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`⭐ تم ترقية ${targetUser.name} إلى إدارة`, "success");
        setGrantModal(null);
        setSearchResults([]);
        setSearchName("");
        loadPromotedUsers();
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("فشل الاتصال", "error");
    } finally {
      setGranting(false);
    }
  };

  // ==================== سحب صلاحية ====================
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    action: string;
    targetUser?: SearchUser;
  }>({ show: false, title: "", message: "", action: "" });

  const handleRevokePermission = (targetUser: SearchUser) => {
    setConfirmModal({
      show: true,
      title: "سحب صلاحية النشر",
      message: `هل أنت متأكد من سحب صلاحية النشر من ${targetUser.name}؟`,
      action: "revoke-permission",
      targetUser,
    });
  };

  const handleRevokeManagement = (targetUser: SearchUser) => {
    setConfirmModal({
      show: true,
      title: "سحب رتبة الإدارة",
      message: `هل أنت متأكد من سحب رتبة الإدارة من ${targetUser.name}؟`,
      action: "revoke-management",
      targetUser,
    });
  };

  const executeRevokePermission = async () => {
    const targetUser = confirmModal.targetUser;
    setConfirmModal({ show: false, title: "", message: "", action: "" });
    if (!targetUser) return;
    try {
      const perm = (targetUser as any).uploadPermissions?.[0];
      if (!perm) {
        showToast("لا توجد صلاحية نشطة", "error");
        return;
      }
      const res = await csrfFetch("/api/admin/upgrade", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionId: perm.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`⚠️ تم سحب الصلاحية من ${targetUser.name}`, "warning");
        loadPromotedUsers();
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("فشل الاتصال", "error");
    }
  };

  const executeRevokeManagement = async () => {
    const targetUser = confirmModal.targetUser;
    setConfirmModal({ show: false, title: "", message: "", action: "" });
    if (!targetUser) return;
    try {
      const res = await csrfFetch("/api/admin/upgrade", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUser.id,
          action: "revoke-management",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`⚠️ تم سحب رتبة الإدارة من ${targetUser.name}`, "warning");
        loadPromotedUsers();
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("فشل الاتصال", "error");
    }
  };

  // ==================== طلبات ترقية المستويات ====================
  const toggleSelect = (id: string) => {
    const next = new Set(selectedRequests);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRequests(next);
  };

  const handleLevelAction = async (action: "APPROVED" | "REJECTED") => {
    if (selectedRequests.size === 0) {
      showToast("اختر طلباً واحداً على الأقل", "warning");
      return;
    }
    try {
      const res = await csrfFetch("/api/promotion/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestIds: Array.from(selectedRequests),
          action,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `✅ ${action === "APPROVED" ? "تمت الموافقة" : "تم الرفض"} على ${data.count} طلب`,
          "success",
        );
        setSelectedRequests(new Set());
        loadLevelRequests();
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("فشل الاتصال", "error");
    }
  };

  // ==================== أدوات مساعدة ====================
  const getLevelLabel = (l: string) =>
    ({ LEVEL_1: "م1", LEVEL_2: "م2", LEVEL_3: "م3", LEVEL_4: "م4" })[l] || l;
  const getRoleLabel = (r: string) =>
    ({ ADMIN: "أدمن", MANAGEMENT: "إدارة", TEACHER: "معلم", STUDENT: "طالب" })[
      r
    ] || r;
  const getRoleColor = (r: string) =>
    ({
      ADMIN: "#ff3131",
      MANAGEMENT: "#ffca28",
      TEACHER: "#bf5af2",
      STUDENT: "#00e5ff",
    })[r] || "#8b949e";

  const glassStyle: React.CSSProperties = {
    background: "rgba(10, 20, 40, 0.5)",
    backdropFilter: "blur(25px)",
    WebkitBackdropFilter: "blur(25px)",
    border: "1px solid rgba(0, 229, 255, 0.12)",
    borderRadius: "18px",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    background: "rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "#e6edf3",
    fontSize: "0.9rem",
    fontFamily: "'Cairo', sans-serif",
    outline: "none",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "transparent",
        fontFamily: "'Cairo', sans-serif",
        color: "#fff",
      }}
    >
      <Header />
      <Sidebar />
      <PageTransition>
        <main
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "100px 20px 60px",
          }}
        >
          {/* ========== الهيدر ========== */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              ...glassStyle,
              padding: "20px 30px",
              marginBottom: "25px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "15px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  router.push(userRole === "ADMIN" ? "/admin" : "/management")
                }
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "rgba(0,229,255,0.08)",
                  border: "1px solid rgba(0,229,255,0.2)",
                  color: "#00e5ff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BackIcon />
              </motion.button>
              <h2
                style={{
                  color: "#00e5ff",
                  fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                🏆 إدارة الترقيات
              </h2>
            </div>
          </motion.div>

          {/* ========== التبويبات ========== */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            {[
              { key: "permissions", label: "📤 صلاحيات النشر" },
              { key: "management", label: "⭐ ترقية لإدارة" },
              ...(userRole === "ADMIN"
                ? [{ key: "levels", label: "🎓 ترقية المستويات" }]
                : []),
            ].map((tab: any) => (
              <motion.button
                key={tab.key}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setViewTab(tab.key as ViewTab)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "14px",
                  background:
                    viewTab === tab.key
                      ? "rgba(0,229,255,0.12)"
                      : "rgba(255,255,255,0.03)",
                  border:
                    viewTab === tab.key
                      ? "1px solid #00e5ff"
                      : "1px solid rgba(255,255,255,0.08)",
                  color: viewTab === tab.key ? "#00e5ff" : "#8b949e",
                  cursor: "pointer",
                  fontFamily: "'Cairo', sans-serif",
                  fontWeight: viewTab === tab.key ? 700 : 500,
                  fontSize: "0.9rem",
                }}
              >
                {tab.label}
              </motion.button>
            ))}
          </div>

          {/* ========== محتوى التبويبات ========== */}
          <AnimatePresence mode="wait">
            {(viewTab === "permissions" || viewTab === "management") && (
              <motion.div
                key="permissions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* منطقة البحث */}
                <div
                  style={{
                    ...glassStyle,
                    padding: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginBottom: "15px",
                    }}
                  >
                    {userRole === "ADMIN" && (
                      <select
                        value={searchLevel}
                        onChange={(e) => setSearchLevel(e.target.value)}
                        style={{
                          ...inputStyle,
                          flex: 1,
                          minWidth: "150px",
                          cursor: "pointer",
                          appearance: "none",
                        }}
                      >
                        <option value="">كل المستويات</option>
                        <option value="LEVEL_1">المستوى الأول</option>
                        <option value="LEVEL_2">المستوى الثاني</option>
                        <option value="LEVEL_3">المستوى الثالث</option>
                        <option value="LEVEL_4">المستوى الرابع</option>
                      </select>
                    )}
                    <input
                      type="text"
                      placeholder="🔍 اسم المستخدم..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") searchUsers();
                      }}
                      style={{ ...inputStyle, flex: 2, minWidth: "200px" }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={searchUsers}
                      disabled={searching}
                      style={{
                        padding: "11px 20px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #00e5ff, #0077b6)",
                        border: "none",
                        color: "#010204",
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: "'Cairo', sans-serif",
                        opacity: searching ? 0.6 : 1,
                      }}
                    >
                      <SearchIcon /> بحث
                    </motion.button>
                  </div>

                  {/* نتائج البحث */}
                  {searchResults.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {searchResults.map((u) => (
                        <motion.div
                          key={u.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          style={{
                            ...glassStyle,
                            padding: "14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <span
                              style={{
                                color: getRoleColor(u.role),
                                fontWeight: 700,
                              }}
                            >
                              {u.name}
                            </span>
                            <span
                              style={{ color: "#8b949e", fontSize: "0.75rem" }}
                            >
                              {getRoleLabel(u.role)} {getLevelLabel(u.level)}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {viewTab === "permissions" &&
                              !(u as any).uploadPermissions?.length && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleGrantPermission(u)}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: "10px",
                                    background:
                                      "linear-gradient(135deg, #bf5af2, #7a00ff)",
                                    border: "none",
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                    fontFamily: "'Cairo', sans-serif",
                                  }}
                                >
                                  📤 منح نشر
                                </motion.button>
                              )}
                            {viewTab === "management" && !u.managementLevel && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleGrantManagement(u)}
                                style={{
                                  padding: "6px 14px",
                                  borderRadius: "10px",
                                  background:
                                    "linear-gradient(135deg, #ffca28, #e3b341)",
                                  border: "none",
                                  color: "#010204",
                                  fontWeight: 700,
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  fontFamily: "'Cairo', sans-serif",
                                }}
                              >
                                ⭐ ترقية لإدارة
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* سجل المرقّين */}
                {/* ===== المستخدمين غير المرقّين ===== */}
                <h3
                  style={{
                    color: "#8b949e",
                    fontSize: "0.95rem",
                    marginBottom: "8px",
                  }}
                >
                  👥 مستخدمون متاحون للترقية
                </h3>
                {allUsers.filter((u: any) =>
                  viewTab === "permissions"
                    ? !u.uploadPermissions?.length
                    : !u.managementLevel,
                ).length === 0 ? (
                  <div
                    style={{
                      ...glassStyle,
                      padding: "16px",
                      textAlign: "center",
                      color: "#8b949e",
                      marginBottom: "20px",
                      fontSize: "0.85rem",
                    }}
                  >
                    جميع المستخدمين تم ترقيتهم
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      marginBottom: "25px",
                    }}
                  >
                    {allUsers
                      .filter((u: any) =>
                        viewTab === "permissions"
                          ? !u.uploadPermissions?.length
                          : !u.managementLevel,
                      )
                      .map((u) => (
                        <motion.div
                          key={u.id}
                          whileHover={{ borderColor: "rgba(0,229,255,0.2)" }}
                          style={{
                            ...glassStyle,
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                color: getRoleColor(u.role),
                                fontWeight: 600,
                                fontSize: "0.9rem",
                              }}
                            >
                              {u.name}
                            </span>
                            <span
                              style={{ color: "#8b949e", fontSize: "0.7rem" }}
                            >
                              {getRoleLabel(u.role)}
                            </span>
                          </div>
                          <div>
                            {viewTab === "permissions" && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleGrantPermission(u)}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: "8px",
                                  background:
                                    "linear-gradient(135deg, #bf5af2, #7a00ff)",
                                  border: "none",
                                  color: "#fff",
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                  fontFamily: "'Cairo', sans-serif",
                                }}
                              >
                                📤 منح النشر
                              </motion.button>
                            )}
                            {viewTab === "management" && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleGrantManagement(u)}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: "8px",
                                  background:
                                    "linear-gradient(135deg, #ffca28, #e3b341)",
                                  border: "none",
                                  color: "#010204",
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                  fontFamily: "'Cairo', sans-serif",
                                }}
                              >
                                ⭐ ترقية لإدارة
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                )}

                {/* ===== حسابات تم ترقيتها ===== */}
                <h3
                  style={{
                    color: "#ffca28",
                    fontSize: "0.95rem",
                    marginBottom: "8px",
                  }}
                >
                  🏆 حسابات تم ترقيتها
                </h3>
                {allUsers.filter((u: any) =>
                  viewTab === "permissions"
                    ? u.uploadPermissions?.length > 0
                    : u.managementLevel,
                ).length === 0 ? (
                  <div
                    style={{
                      ...glassStyle,
                      padding: "16px",
                      textAlign: "center",
                      color: "#8b949e",
                      fontSize: "0.85rem",
                    }}
                  >
                    لا توجد حسابات مرقّاة
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    {allUsers
                      .filter((u: any) =>
                        viewTab === "permissions"
                          ? u.uploadPermissions?.length > 0
                          : u.managementLevel,
                      )
                      .map((u) => (
                        <motion.div
                          key={u.id}
                          whileHover={{ borderColor: "rgba(255,202,40,0.3)" }}
                          style={{
                            ...glassStyle,
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "8px",
                            border: "1px solid rgba(255,202,40,0.15)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                color: "#ffca28",
                                fontWeight: 600,
                                fontSize: "0.9rem",
                              }}
                            >
                              {u.name}
                            </span>
                            <span
                              style={{ color: "#8b949e", fontSize: "0.7rem" }}
                            >
                              {getRoleLabel(u.role)}
                            </span>
                            {viewTab === "permissions" && (
                              <span
                                style={{
                                  color: "#bf5af2",
                                  fontSize: "0.65rem",
                                  background: "rgba(191,90,242,0.15)",
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                }}
                              >
                                📤 ناشر
                              </span>
                            )}
                            {viewTab === "management" && (
                              <span
                                style={{
                                  color: "#ffca28",
                                  fontSize: "0.65rem",
                                  background: "rgba(255,202,40,0.15)",
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                }}
                              >
                                ⭐ إدارة
                              </span>
                            )}
                          </div>
                          <div>
                            {viewTab === "permissions" && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleRevokePermission(u)}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: "8px",
                                  background: "rgba(248,81,73,0.12)",
                                  border: "1px solid rgba(248,81,73,0.3)",
                                  color: "#f85149",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  fontFamily: "'Cairo', sans-serif",
                                }}
                              >
                                🗑️ سحب النشر
                              </motion.button>
                            )}
                            {viewTab === "management" && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleRevokeManagement(u)}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: "8px",
                                  background: "rgba(248,81,73,0.12)",
                                  border: "1px solid rgba(248,81,73,0.3)",
                                  color: "#f85149",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  fontFamily: "'Cairo', sans-serif",
                                }}
                              >
                                🗑️ سحب الإدارة
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ===== ترقية المستويات (للأدمن فقط) ===== */}
            {viewTab === "levels" && userRole === "ADMIN" && (
              <motion.div
                key="levels"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {selectedRequests.size > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginBottom: "15px",
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleLevelAction("APPROVED")}
                      style={{
                        padding: "12px 24px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #238636, #2ea043)",
                        border: "none",
                        color: "#fff",
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: "'Cairo', sans-serif",
                      }}
                    >
                      ✅ موافقة ({selectedRequests.size})
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleLevelAction("REJECTED")}
                      style={{
                        padding: "12px 24px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #da3633, #f85149)",
                        border: "none",
                        color: "#fff",
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: "'Cairo', sans-serif",
                      }}
                    >
                      ❌ رفض ({selectedRequests.size})
                    </motion.button>
                  </div>
                )}

                {levelRequests.length === 0 ? (
                  <div
                    style={{
                      ...glassStyle,
                      padding: "40px",
                      textAlign: "center",
                      color: "#8b949e",
                    }}
                  >
                    لا توجد طلبات ترقية مستويات معلقة
                  </div>
                ) : (
                  <div style={{ ...glassStyle, overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
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
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                              background: "rgba(0,0,0,0.3)",
                            }}
                          >
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "center",
                                color: "#8b949e",
                                fontSize: "0.75rem",
                              }}
                            >
                              اختيار
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#8b949e",
                                fontSize: "0.75rem",
                              }}
                            >
                              الاسم
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#8b949e",
                                fontSize: "0.75rem",
                              }}
                            >
                              من
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#8b949e",
                                fontSize: "0.75rem",
                              }}
                            >
                              إلى
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#8b949e",
                                fontSize: "0.75rem",
                              }}
                            >
                              التاريخ
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {levelRequests.map((req: any) => (
                            <tr
                              key={req.id}
                              style={{
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.03)",
                              }}
                            >
                              <td
                                style={{ padding: "10px", textAlign: "center" }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedRequests.has(req.id)}
                                  onChange={() => toggleSelect(req.id)}
                                  style={{
                                    accentColor: "#00e5ff",
                                    transform: "scale(1.2)",
                                    cursor: "pointer",
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  color: "#e6edf3",
                                  fontWeight: 600,
                                }}
                              >
                                {req.user?.name || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  color: "#00e5ff",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {getLevelLabel(req.fromLevel)}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  color: "#39ff14",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {getLevelLabel(req.toLevel)}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  color: "#8b949e",
                                  fontSize: "0.7rem",
                                }}
                              >
                                {new Date(req.createdAt).toLocaleDateString(
                                  "ar-YE",
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </PageTransition>

      {/* ==================== نافذة تأكيد ==================== */}
      <AnimatePresence>
        {confirmModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(10px)",
              padding: "20px",
            }}
            onClick={() =>
              setConfirmModal({
                show: false,
                title: "",
                message: "",
                action: "",
              })
            }
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...glassStyle,
                padding: "30px",
                maxWidth: "420px",
                width: "100%",
                textAlign: "center",
                border: "1px solid rgba(248,81,73,0.3)",
                boxShadow: "0 0 60px rgba(248,81,73,0.15)",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "rgba(248,81,73,0.15)",
                  margin: "0 auto 15px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                }}
              >
                ⚠️
              </div>
              <h3
                style={{
                  color: "#fff",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  marginBottom: "8px",
                }}
              >
                {confirmModal.title}
              </h3>
              <p
                style={{
                  color: "#8b949e",
                  fontSize: "0.9rem",
                  marginBottom: "25px",
                }}
              >
                {confirmModal.message}
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    setConfirmModal({
                      show: false,
                      title: "",
                      message: "",
                      action: "",
                    })
                  }
                  style={{
                    flex: 1,
                    padding: "13px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#8b949e",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  إلغاء
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (confirmModal.action === "revoke-permission")
                      executeRevokePermission();
                    else if (confirmModal.action === "revoke-management")
                      executeRevokeManagement();
                  }}
                  style={{
                    flex: 1.5,
                    padding: "13px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #f85149, #da3633)",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 800,
                    fontFamily: "'Cairo', sans-serif",
                    boxShadow: "0 8px 25px rgba(248,81,73,0.3)",
                  }}
                >
                  نعم، تأكيد
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />

      {/* ==================== نافذة تأكيد الترقية ==================== */}
      <AnimatePresence>
        {grantModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(10px)",
              padding: "20px",
            }}
            onClick={() => setGrantModal(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...glassStyle,
                padding: "30px",
                maxWidth: "420px",
                width: "100%",
                textAlign: "center",
                border: "1px solid rgba(191,90,242,0.3)",
                boxShadow: "0 0 60px rgba(191,90,242,0.15)",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "rgba(191,90,242,0.15)",
                  margin: "0 auto 15px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                }}
              >
                📤
              </div>
              <h3
                style={{
                  color: "#fff",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  marginBottom: "8px",
                }}
              >
                تأكيد منح الصلاحية
              </h3>
              <p
                style={{
                  color: "#8b949e",
                  fontSize: "0.9rem",
                  marginBottom: "25px",
                }}
              >
                هل أنت متأكد من منح{" "}
                <span style={{ color: "#00e5ff", fontWeight: 700 }}>
                  {grantModal.name}
                </span>{" "}
                صلاحية النشر في المكتبة؟
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setGrantModal(null)}
                  style={{
                    flex: 1,
                    padding: "13px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#8b949e",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  إلغاء
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={executeGrantPermission}
                  disabled={granting}
                  style={{
                    flex: 1.5,
                    padding: "13px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #bf5af2, #7a00ff)",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 800,
                    fontFamily: "'Cairo', sans-serif",
                    opacity: granting ? 0.6 : 1,
                  }}
                >
                  {granting ? "⏳..." : "نعم، منح الصلاحية"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

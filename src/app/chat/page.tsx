"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import { useToast } from "@/components/ui/Toast";
import PageTransition from "@/components/layout/PageTransition";
import { useAuthStore } from "@/store/authStore";
import { csrfFetch } from "@/lib/csrfClient";

// ==================== الأنواع ====================
interface ChatUser {
  id: string;
  name: string;
  role: string;
  level?: string;
  lastSeenAt?: string;
  lastLoginAt?: string;
}

interface Conversation {
  userId: string;
  name: string;
  role: string;
  level?: string;
  lastMessage: string;
  createdAt: string;
  isRead: boolean;
  isSent: boolean;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  isRead: boolean;
  isEdited: boolean;
  createdAt: string;
  sender: { id: string; name: string };
}

// ==================== الأيقونات ====================
const BackIcon = () => (
  <svg
    width="22"
    height="22"
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

const EditIcon = () => (
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
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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

const BlockIcon = () => (
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
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

// ==================== المكوّن الرئيسي ====================
export default function ChatPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { showToast } = useToast();

  const userId = user?.id || "";
  const userName = user?.name || "";
  const userRole = user?.role || "";
  const userLevel = user?.level || "";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [convLoading, setConvLoading] = useState(true);

  // البحث
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [filterLevel, setFilterLevel] = useState("");
  const [filterRole, setFilterRole] = useState("");

  // تعديل وحذف
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editBody, setEditBody] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    show: boolean;
    title: string;
    message: string;
    action: string;
    messageId?: string;
  }>({ show: false, title: "", message: "", action: "" });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ==================== تحميل المحادثات ====================
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/messages");
      const data = await res.json();
      if (data.success) setConversations(data.data);
    } catch {
      /* صامت */
    }
    setConvLoading(false);
  }, []);

  // ==================== تحميل رسائل محادثة ====================
  const loadMessages = useCallback(async (otherId: string) => {
    try {
      const res = await fetch(`/api/chat/messages?userId=${otherId}`);
      const data = await res.json();
      if (data.success) setMessages(data.data);
    } catch {
      /* صامت */
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ==================== Pusher ====================
  useEffect(() => {
    if (!userId) return;
    let channel: any = null;
    const setup = async () => {
      try {
        const PusherClient = (await import("pusher-js")).default;
        const pusher = new PusherClient(
          process.env.NEXT_PUBLIC_PUSHER_KEY || "45585387a0d70f319a67",
          {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
          },
        );
        channel = pusher.subscribe(`user-${userId}`);
        channel.bind("new-message", (data: any) => {
          loadConversations();
          if (
            selectedUser &&
            (data.senderId === selectedUser.id ||
              data.receiverId === selectedUser.id)
          ) {
            loadMessages(selectedUser.id);
          }
        });
        channel.bind("message-sent", () => {
          loadConversations();
        });
      } catch {
        /* صامت */
      }
    };
    setup();
    return () => {
      if (channel) {
        channel.unbind_all();
        channel.unsubscribe();
      }
    };
  }, [userId, selectedUser, loadConversations]);

  // ==================== البحث ====================
  const searchUsers = async () => {
    if (searchTerm.length < 2 && !filterLevel && !filterRole) {
      setSearchResults([]);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (filterLevel) params.set("level", filterLevel);
      if (filterRole) params.set("role", filterRole);
      const res = await fetch(`/api/chat/users?${params}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
    } catch {
      /* صامت */
    }
  };

  // ==================== فتح محادثة ====================
  const openChat = (chatUser: ChatUser) => {
    setSelectedUser(chatUser);
    loadMessages(chatUser.id);
    setShowMobileChat(true);
    setShowSearch(false);
    setSearchResults([]);
    setSearchTerm("");
  };

  const closeChat = () => {
    setSelectedUser(null);
    setMessages([]);
    setShowMobileChat(false);
  };

  // ==================== إرسال رسالة ====================
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    setLoading(true);
    try {
      const res = await csrfFetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          body: newMessage.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage("");
        loadMessages(selectedUser.id);
        loadConversations();
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("فشل الإرسال", "error");
    } finally {
      setLoading(false);
    }
  };

  // ==================== تعديل رسالة ====================
  const handleEditMessage = async () => {
    if (!editingMsg || !editBody.trim()) return;
    try {
      const res = await csrfFetch("/api/chat/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: editingMsg.id,
          newBody: editBody.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("✅ تم تعديل الرسالة", "success");
        setEditingMsg(null);
        if (selectedUser) loadMessages(selectedUser.id);
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("فشل التعديل", "error");
    }
  };

  // ==================== حذف رسالة ====================
  const handleDeleteMessage = (messageId: string) => {
    setConfirmAction({
      show: true,
      title: "حذف الرسالة",
      message: "هل أنت متأكد من حذف هذه الرسالة؟",
      action: "delete-message",
      messageId,
    });
  };

  const executeDeleteMessage = async () => {
    const messageId = confirmAction.messageId;
    setConfirmAction({ show: false, title: "", message: "", action: "" });
    if (!messageId) return;
    try {
      const res = await csrfFetch("/api/chat/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("🗑️ تم حذف الرسالة", "warning");
        if (selectedUser) loadMessages(selectedUser.id);
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("فشل الحذف", "error");
    }
  };

  // ==================== حذف المحادثة ====================
  const handleDeleteConversation = () => {
    if (!selectedUser) return;
    setConfirmAction({
      show: true,
      title: "حذف المحادثة",
      message: "هل أنت متأكد من حذف المحادثة بالكامل؟",
      action: "delete-conversation",
    });
  };

  const executeDeleteConversation = async () => {
    if (!selectedUser) return;
    setConfirmAction({ show: false, title: "", message: "", action: "" });
    try {
      const res = await csrfFetch("/api/chat/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otherUserId: selectedUser.id,
          action: "delete-conversation",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("🗑️ تم حذف المحادثة", "warning");
        closeChat();
        loadConversations();
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("فشل الحذف", "error");
    }
  };

  // ==================== حظر مستخدم ====================
  const handleBlockUser = () => {
    if (!selectedUser) return;
    setConfirmAction({
      show: true,
      title: "حظر المستخدم",
      message: `هل أنت متأكد من حظر ${selectedUser.name}؟`,
      action: "block",
    });
  };

  const executeBlockUser = async () => {
    if (!selectedUser) return;
    setConfirmAction({ show: false, title: "", message: "", action: "" });
    try {
      const res = await csrfFetch("/api/chat/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otherUserId: selectedUser.id,
          action: "block",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("🚫 تم حظر المستخدم", "warning");
        closeChat();
        loadConversations();
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("فشل الحظر", "error");
    }
  };

  // ==================== أدوات مساعدة ====================
  const getRoleColor = (role: string) =>
    ({
      ADMIN: "#ff3131",
      MANAGEMENT: "#ffca28",
      TEACHER: "#bf5af2",
      STUDENT: "#00e5ff",
    })[role] || "#8b949e";
  const getRoleLabel = (role: string) =>
    ({ ADMIN: "أدمن", MANAGEMENT: "إدارة", TEACHER: "معلم", STUDENT: "طالب" })[
      role
    ] || role;
  const getLevelLabel = (l?: string) =>
    l
      ? { LEVEL_1: "م1", LEVEL_2: "م2", LEVEL_3: "م3", LEVEL_4: "م4" }[l] || l
      : "";
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("ar-YE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ar-YE", { month: "short", day: "numeric" });

  const isOnline = (u: ChatUser) => {
    if (!u.lastSeenAt) return false;
    return Date.now() - new Date(u.lastSeenAt).getTime() < 5 * 60 * 1000;
  };

  const lastSeenText = (u: ChatUser) => {
    if (!u.lastSeenAt) return "";
    if (isOnline(u)) return "متصل الآن";
    return `آخر ظهور: ${formatDate(u.lastSeenAt)} ${formatTime(u.lastSeenAt)}`;
  };

  const glassStyle: React.CSSProperties = {
    background: "rgba(10, 20, 40, 0.55)",
    backdropFilter: "blur(25px)",
    WebkitBackdropFilter: "blur(25px)",
    border: "1px solid rgba(0, 229, 255, 0.1)",
    borderRadius: "16px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "rgba(0, 0, 0, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "10px",
    color: "#e6edf3",
    fontSize: "0.85rem",
    fontFamily: "'Cairo', sans-serif",
    outline: "none",
  };

  // ==================== الواجهة ====================
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
        <div
          style={{
            display: "flex",
            height: "calc(100vh - 60px)",
            paddingTop: "90px",
          }}
        >
          {/* ========== قائمة المحادثات ========== */}
          <div
            className={showMobileChat ? "hidden md:flex" : "flex"}
            style={{
              width: "100%",
              maxWidth: "380px",
              flexDirection: "column",
              borderLeft: "1px solid rgba(255,255,255,0.05)",
              ...glassStyle,
              margin: "0 10px",
              overflow: "hidden",
            }}
          >
            {/* هيدر القائمة */}
            <div
              style={{
                padding: "15px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  color: "#00e5ff",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                💬 المحادثات
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSearch(!showSearch)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  background: showSearch
                    ? "rgba(0,229,255,0.12)"
                    : "rgba(255,255,255,0.03)",
                  border: showSearch
                    ? "1px solid #00e5ff"
                    : "1px solid rgba(255,255,255,0.08)",
                  color: showSearch ? "#00e5ff" : "#8b949e",
                  cursor: "pointer",
                  fontFamily: "'Cairo', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <SearchIcon /> بحث
              </motion.button>
            </div>

            {/* لوحة البحث */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    style={{
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="ابحث بالاسم..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={inputStyle}
                    />
                    {(userRole === "ADMIN" || userRole === "MANAGEMENT") && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        {userRole === "ADMIN" && (
                          <select
                            value={filterLevel}
                            onChange={(e) => setFilterLevel(e.target.value)}
                            style={{
                              ...inputStyle,
                              flex: 1,
                              cursor: "pointer",
                              appearance: "none",
                            }}
                          >
                            <option value="">كل المستويات</option>
                            <option value="LEVEL_1">المستوى 1</option>
                            <option value="LEVEL_2">المستوى 2</option>
                            <option value="LEVEL_3">المستوى 3</option>
                            <option value="LEVEL_4">المستوى 4</option>
                          </select>
                        )}
                        <select
                          value={filterRole}
                          onChange={(e) => setFilterRole(e.target.value)}
                          style={{
                            ...inputStyle,
                            flex: 1,
                            cursor: "pointer",
                            appearance: "none",
                          }}
                        >
                          <option value="">كل الهويات</option>
                          <option value="STUDENT">طالب</option>
                          <option value="TEACHER">معلم</option>
                          {userRole === "ADMIN" && (
                            <option value="MANAGEMENT">إدارة</option>
                          )}
                        </select>
                      </div>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={searchUsers}
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #00e5ff, #0077b6)",
                        border: "none",
                        color: "#010204",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: "0.85rem",
                        fontFamily: "'Cairo', sans-serif",
                      }}
                    >
                      <SearchIcon /> بحث
                    </motion.button>
                    {searchResults.length > 0 && (
                      <div
                        style={{
                          maxHeight: "200px",
                          overflowY: "auto",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        {searchResults.map((u) => (
                          <motion.button
                            key={u.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => openChat(u)}
                            style={{
                              padding: "10px",
                              borderRadius: "10px",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.05)",
                              color: "#fff",
                              cursor: "pointer",
                              textAlign: "right",
                              fontFamily: "'Cairo', sans-serif",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                color: getRoleColor(u.role),
                                fontSize: "0.65rem",
                                background: "rgba(255,255,255,0.05)",
                                padding: "2px 8px",
                                borderRadius: "20px",
                              }}
                            >
                              {getRoleLabel(u.role)}
                            </span>
                            <span style={{ flex: 1 }}>{u.name}</span>
                            {getLevelLabel(u.level) && (
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  color: "#8b949e",
                                }}
                              >
                                {getLevelLabel(u.level)}
                              </span>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* قائمة المحادثات */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {convLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#8b949e",
                  }}
                >
                  ⏳ جاري التحميل...
                </div>
              ) : conversations.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#8b949e",
                  }}
                >
                  📭 لا توجد محادثات
                </div>
              ) : (
                conversations.map((conv) => (
                  <motion.button
                    key={conv.userId}
                    whileHover={{ background: "rgba(0,229,255,0.05)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      openChat({
                        id: conv.userId,
                        name: conv.name,
                        role: conv.role,
                        level: conv.level,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      border: "none",
                      textAlign: "right",
                      cursor: "pointer",
                      fontFamily: "'Cairo', sans-serif",
                      background:
                        selectedUser?.id === conv.userId
                          ? "rgba(0,229,255,0.08)"
                          : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      transition: "background 0.2s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
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
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            color: "#e6edf3",
                          }}
                        >
                          {conv.name}
                        </span>
                        <span
                          style={{
                            color: getRoleColor(conv.role),
                            fontSize: "0.6rem",
                            background: "rgba(255,255,255,0.05)",
                            padding: "2px 6px",
                            borderRadius: "10px",
                          }}
                        >
                          {getRoleLabel(conv.role)}
                        </span>
                      </div>
                      {!conv.isRead && !conv.isSent && (
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: "#00e5ff",
                            boxShadow: "0 0 6px #00e5ff",
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        color: "#8b949e",
                        fontSize: "0.75rem",
                        marginTop: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {conv.isSent && (
                        <span
                          style={{ color: conv.isRead ? "#00e5ff" : "#5a6a7a" }}
                        >
                          {conv.isRead ? "✓✓" : "✓"}
                        </span>
                      )}
                      {conv.lastMessage}
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </div>

          {/* ========== منطقة الرسائل ========== */}
          <div
            className={!showMobileChat ? "hidden md:flex" : "flex"}
            style={{
              flex: 1,
              flexDirection: "column",
              ...glassStyle,
              margin: "0 10px",
              overflow: "hidden",
            }}
          >
            {selectedUser ? (
              <>
                {/* هيدر المحادثة */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
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
                      gap: "10px",
                    }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={closeChat}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#00e5ff",
                        cursor: "pointer",
                        display: "flex",
                      }}
                      className="md:hidden"
                    >
                      <BackIcon />
                    </motion.button>
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "1rem",
                            color: "#e6edf3",
                          }}
                        >
                          {selectedUser.name}
                        </span>
                        <span
                          style={{
                            color: getRoleColor(selectedUser.role),
                            fontSize: "0.65rem",
                            background: "rgba(255,255,255,0.05)",
                            padding: "2px 8px",
                            borderRadius: "10px",
                          }}
                        >
                          {getRoleLabel(selectedUser.role)}
                        </span>
                        {selectedUser.level && (
                          <span
                            style={{ fontSize: "0.7rem", color: "#8b949e" }}
                          >
                            {getLevelLabel(selectedUser.level)}
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: "0.7rem",
                          color: isOnline(selectedUser) ? "#2ea043" : "#8b949e",
                          margin: "2px 0 0",
                        }}
                      >
                        {lastSeenText(selectedUser)}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleBlockUser}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "8px",
                        background: "rgba(248,81,73,0.1)",
                        border: "1px solid rgba(248,81,73,0.2)",
                        color: "#f85149",
                        cursor: "pointer",
                        fontSize: "0.7rem",
                        fontFamily: "'Cairo', sans-serif",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <BlockIcon /> حظر
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDeleteConversation}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "8px",
                        background: "rgba(248,81,73,0.1)",
                        border: "1px solid rgba(248,81,73,0.2)",
                        color: "#f85149",
                        cursor: "pointer",
                        fontSize: "0.7rem",
                        fontFamily: "'Cairo', sans-serif",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <DeleteIcon /> حذف
                    </motion.button>
                  </div>
                </div>

                {/* الرسائل */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                  {messages.length === 0 && (
                    <p
                      style={{
                        textAlign: "center",
                        color: "#8b949e",
                        marginTop: "40px",
                      }}
                    >
                      ابدأ المحادثة الآن
                    </p>
                  )}
                  {messages.map((msg) => {
                    const isMine = msg.senderId === userId;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          display: "flex",
                          justifyContent: isMine ? "flex-end" : "flex-start",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "75%",
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <div
                            style={{
                              padding: "10px 14px",
                              borderRadius: "16px",
                              background: isMine
                                ? "rgba(0,229,255,0.18)"
                                : "rgba(255,255,255,0.06)",
                              border: isMine
                                ? "1px solid rgba(0,229,255,0.25)"
                                : "1px solid rgba(255,255,255,0.06)",
                              wordBreak: "break-word",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: "0.9rem",
                                lineHeight: 1.5,
                                color: "#e6edf3",
                              }}
                            >
                              {msg.body}
                            </p>
                            {msg.isEdited && (
                              <span
                                style={{ fontSize: "0.6rem", color: "#8b949e" }}
                              >
                                (مُعدّلة)
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              marginTop: "2px",
                              justifyContent: isMine
                                ? "flex-end"
                                : "flex-start",
                            }}
                          >
                            <span
                              style={{ color: "#5a6a7a", fontSize: "0.6rem" }}
                            >
                              {formatTime(msg.createdAt)}
                            </span>
                            {isMine && (
                              <span
                                style={{
                                  color: msg.isRead ? "#00e5ff" : "#5a6a7a",
                                  fontSize: "0.6rem",
                                }}
                              >
                                {msg.isRead ? "✓✓" : "✓"}
                              </span>
                            )}
                            {isMine && (
                              <div style={{ display: "flex", gap: "2px" }}>
                                <motion.button
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.8 }}
                                  onClick={() => {
                                    setEditingMsg(msg);
                                    setEditBody(msg.body);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#8b949e",
                                    cursor: "pointer",
                                    padding: "2px",
                                  }}
                                >
                                  <EditIcon />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.8 }}
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#8b949e",
                                    cursor: "pointer",
                                    padding: "2px",
                                  }}
                                >
                                  <DeleteIcon />
                                </motion.button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* حقل الإرسال */}
                <div
                  style={{
                    padding: "12px",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    gap: "8px",
                  }}
                >
                  <input
                    type="text"
                    placeholder="اكتب رسالتك..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    style={{
                      flex: 1,
                      ...inputStyle,
                      fontSize: "0.9rem",
                      padding: "12px",
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendMessage}
                    disabled={loading}
                    style={{
                      padding: "12px 22px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #7a00ff, #bf5af2)",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: 800,
                      fontFamily: "'Cairo', sans-serif",
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    إرسال
                  </motion.button>
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#8b949e",
                  fontSize: "1rem",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "3rem" }}>💬</div>
                <p>اختر محادثة من القائمة أو ابحث عن مستخدم</p>
              </div>
            )}
          </div>
        </div>
      </PageTransition>

      {/* ==================== نافذة تأكيد زجاجية ==================== */}
      <AnimatePresence>
        {confirmAction.show && (
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
              setConfirmAction({
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
                background: "rgba(10, 20, 40, 0.95)",
                backdropFilter: "blur(30px)",
                WebkitBackdropFilter: "blur(30px)",
                border: "1px solid rgba(248,81,73,0.3)",
                borderRadius: "24px",
                padding: "30px",
                maxWidth: "420px",
                width: "100%",
                textAlign: "center",
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
                {confirmAction.title}
              </h3>
              <p
                style={{
                  color: "#8b949e",
                  fontSize: "0.9rem",
                  marginBottom: "25px",
                }}
              >
                {confirmAction.message}
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    setConfirmAction({
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
                    fontSize: "0.95rem",
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  إلغاء
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (confirmAction.action === "delete-message")
                      executeDeleteMessage();
                    else if (confirmAction.action === "delete-conversation")
                      executeDeleteConversation();
                    else if (confirmAction.action === "block")
                      executeBlockUser();
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
                    fontSize: "0.95rem",
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

      {/* ==================== نافذة تعديل الرسالة ==================== */}
      <AnimatePresence>
        {editingMsg && (
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
            onClick={() => setEditingMsg(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...glassStyle,
                padding: "25px",
                maxWidth: "450px",
                width: "100%",
                border: "1px solid rgba(255,202,40,0.3)",
              }}
            >
              <h3
                style={{
                  color: "#ffca28",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  marginBottom: "15px",
                  textAlign: "center",
                }}
              >
                ✏️ تعديل الرسالة
              </h3>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: "80px",
                  marginBottom: "15px",
                }}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setEditingMsg(null)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
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
                  onClick={handleEditMessage}
                  style={{
                    flex: 2,
                    padding: "12px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #ffca28, #e3b341)",
                    border: "none",
                    color: "#010204",
                    cursor: "pointer",
                    fontWeight: 800,
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  💾 حفظ
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

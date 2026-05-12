"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import { useToast } from "@/components/ui/Toast";
import PageTransition from "@/components/layout/PageTransition";

interface User {
  id: string;
  name: string;
  role: string;
  level?: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  sender: { id: string; name: string };
}

interface Conversation {
  userId: string;
  name: string;
  role: string;
  lastMessage: string;
  createdAt: string;
  isRead: boolean;
  isSent: boolean;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedUser) loadMessages(selectedUser.id);
      loadConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/chat/messages");
      const data = await res.json();
      if (data.success) setConversations(data.data);
    } catch (err) {}
  };

  const loadMessages = async (userId: string) => {
    try {
      const res = await fetch(`/api/chat/messages?userId=${userId}`);
      const data = await res.json();
      if (data.success) setMessages(data.data);
    } catch (err) {}
  };

  const searchUsers = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/chat/users?search=${term}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
    } catch (err) {}
  };

  const selectUser = (user: User) => {
    setSelectedUser(user);
    loadMessages(user.id);
    setSearchTerm("");
    setSearchResults([]);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: selectedUser.id, body: newMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage("");
        loadMessages(selectedUser.id);
        loadConversations();
      } else {
        showToast(data.message, "error");
      }
    } catch (err) {
      showToast("فشل الإرسال", "error");
    } finally {
      setLoading(false);
    }
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
          paddingTop: "90px",
          paddingBottom: "60px",
          display: "flex",
          height: "100vh",
        }}
      >
        {/* قائمة المحادثات */}
        <div
          style={{
            width: "320px",
            borderLeft: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(13,17,23,0.95)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* بحث */}
          <div style={{ padding: "15px" }}>
            <input
              type="text"
              placeholder="🔍 بحث عن مستخدم..."
              value={searchTerm}
              onChange={(e) => searchUsers(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#fff",
                fontFamily: "'Cairo', sans-serif",
                fontSize: "0.85rem",
              }}
            />
            {/* نتائج البحث */}
            {searchResults.length > 0 && (
              <div
                style={{
                  marginTop: "10px",
                  background: "rgba(0,0,0,0.8)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => selectUser(user)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "none",
                      background: "transparent",
                      color: "#fff",
                      textAlign: "right",
                      cursor: "pointer",
                      fontFamily: "'Cairo', sans-serif",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        color: getRoleColor(user.role),
                        fontSize: "0.7rem",
                        background: "rgba(255,255,255,0.05)",
                        padding: "2px 8px",
                        borderRadius: "20px",
                      }}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                    <span>{user.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* المحادثات */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {conversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() =>
                  selectUser({
                    id: conv.userId,
                    name: conv.name,
                    role: conv.role,
                  })
                }
                style={{
                  width: "100%",
                  padding: "12px 15px",
                  border: "none",
                  background:
                    selectedUser?.id === conv.userId
                      ? "rgba(0,229,255,0.05)"
                      : "transparent",
                  color: "#fff",
                  textAlign: "right",
                  cursor: "pointer",
                  fontFamily: "'Cairo', sans-serif",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                    {conv.name}
                  </span>
                  {!conv.isRead && !conv.isSent && (
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#00e5ff",
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    color: "#8b949e",
                    fontSize: "0.75rem",
                    marginTop: "4px",
                  }}
                >
                  {conv.isSent && "✓✓ "}
                  {conv.lastMessage}
                </div>
              </button>
            ))}
            {conversations.length === 0 && (
              <p
                style={{
                  color: "#8b949e",
                  textAlign: "center",
                  padding: "20px",
                  fontSize: "0.85rem",
                }}
              >
                لا توجد محادثات
              </p>
            )}
          </div>
        </div>

        {/* منطقة الرسائل */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {selectedUser ? (
            <>
              {/* هيدر المحادثة */}
              <div
                style={{
                  padding: "15px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(13,17,23,0.95)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    color: getRoleColor(selectedUser.role),
                    fontSize: "0.7rem",
                    background: "rgba(255,255,255,0.05)",
                    padding: "3px 10px",
                    borderRadius: "20px",
                  }}
                >
                  {getRoleLabel(selectedUser.role)}
                </span>
                <span style={{ fontWeight: 700 }}>{selectedUser.name}</span>
              </div>

              {/* الرسائل */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
                {messages.map((msg) => {
                  const isMine = msg.senderId !== selectedUser.id;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: isMine ? "flex-end" : "flex-start",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "70%",
                          padding: "10px 15px",
                          borderRadius: "16px",
                          background: isMine
                            ? "rgba(0,229,255,0.15)"
                            : "rgba(255,255,255,0.05)",
                          border: isMine
                            ? "1px solid rgba(0,229,255,0.2)"
                            : "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.9rem",
                            lineHeight: 1.5,
                          }}
                        >
                          {msg.body}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            gap: "5px",
                            marginTop: "5px",
                            justifyContent: "flex-end",
                          }}
                        >
                          <span
                            style={{ color: "#8b949e", fontSize: "0.6rem" }}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString(
                              "ar-YE",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                          {isMine && (
                            <span
                              style={{
                                color: msg.isRead ? "#00e5ff" : "#8b949e",
                                fontSize: "0.6rem",
                              }}
                            >
                              ✓✓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* حقل الإرسال */}
              <div
                style={{
                  padding: "15px",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(13,17,23,0.95)",
                  display: "flex",
                  gap: "10px",
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
                    padding: "12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: "0.9rem",
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading}
                  style={{
                    padding: "12px 20px",
                    background: "linear-gradient(135deg, #2188ff, #7a00ff)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontFamily: "'Cairo', sans-serif",
                    fontWeight: 700,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  إرسال
                </button>
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
                fontSize: "1.1rem",
              }}
            >
              💬 اختر محادثة من القائمة أو ابحث عن مستخدم
            </div>
          )}
        </div>
      </main>
      </PageTransition>

      <Footer />
    </div>
  );
}

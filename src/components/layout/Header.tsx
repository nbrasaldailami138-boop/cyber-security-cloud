"use client";

import { useState, useEffect } from "react";

export default function Header() {
  const [clock, setClock] = useState("00:00:00 AM");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      let h = now.getHours();
      const m = now.getMinutes().toString().padStart(2, "0");
      const s = now.getSeconds().toString().padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      setClock(`${h}:${m}:${s} ${ampm}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 5%",
        background: "rgba(2, 4, 8, 0.75)",
        backdropFilter: "blur(25px)",
        WebkitBackdropFilter: "blur(25px)",
        borderBottom: "2px solid rgba(0, 229, 255, 0.3)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        flexWrap: "wrap",
        gap: "8px",
      }}
    >
      {/* الساعة */}
      <div
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "clamp(1rem, 3vw, 1.8rem)",
          fontWeight: 700,
          color: "#00e5ff",
          textShadow: "0 0 15px #00e5ff, 0 0 30px rgba(0,229,255,0.4)",
          minWidth: "140px",
          direction: "ltr",
        }}
      >
        {clock}
      </div>

      {/* اسم الموقع */}
      <div style={{ textAlign: "center", flex: 1 }}>
        <h2
          style={{
            fontSize: "clamp(0.9rem, 2vw, 1.3rem)",
            fontWeight: 700,
            color: "#fff",
            textShadow: "0 0 15px #00e5ff, 0 0 30px rgba(0,229,255,0.4)",
            margin: 0,
          }}
        >
          سحابة الأمن السيبراني
        </h2>
        <p
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "clamp(0.6rem, 1.4vw, 0.85rem)",
            color: "#00e5ff",
            textTransform: "uppercase",
            letterSpacing: "2px",
            margin: "2px 0 0",
          }}
        >
          Cybersecurity Cloud
        </p>
      </div>

      {/* الجامعة */}
      <div style={{ textAlign: "right" }}>
        <h1
          style={{
            fontSize: "clamp(0.85rem, 2.5vw, 1.3rem)",
            color: "#fff",
            fontWeight: 900,
            textShadow: "0 0 10px rgba(0,229,255,0.3)",
            margin: 0,
          }}
        >
          جامعة ذمار - كلية الحاسبات
        </h1>
        <p
          style={{
            fontSize: "clamp(0.65rem, 1.8vw, 0.9rem)",
            color: "#00e5ff",
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 500,
            margin: "2px 0 0",
          }}
        >
          Cyber Security Department
        </p>
      </div>
    </header>
  );
}

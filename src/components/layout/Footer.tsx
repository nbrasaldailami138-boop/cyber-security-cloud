export default function Footer() {
  return (
    <footer
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: "8px",
        textAlign: "center",
        background: "rgba(2, 4, 8, 0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(0, 229, 255, 0.15)",
        fontSize: "clamp(0.65rem, 1.3vw, 0.8rem)",
        color: "#bbb",
      }}
    >
      <div>
        تطوير وإشراف:{" "}
        <span style={{ color: "#00e5ff", fontWeight: "bold" }}>
          محمد إبراهيم الديلمي | أحمد الهيدمة
        </span>
      </div>
      <div
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.65rem",
          opacity: 0.6,
          marginTop: "3px",
        }}
      >
        OFFICIAL CYBER SECURITY PLATFORM - DHAMAR UNIVERSITY &copy; 2026
      </div>
    </footer>
  );
}

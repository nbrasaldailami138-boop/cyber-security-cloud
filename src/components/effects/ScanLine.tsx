"use client";

import { useEffect, useState, useRef } from "react";

const colors = [
  "rgba(0, 229, 255, 0.5)",
  "rgba(191, 90, 242, 0.5)",
  "rgba(0, 255, 136, 0.5)",
  "rgba(255, 49, 49, 0.4)",
];

export default function ScanLine() {
  const [position, setPosition] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const colorTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const speed = 10 + Math.random() * 10;
    const interval = setInterval(() => {
      setPosition((prev) => (prev >= 100 ? 0 : prev + 0.3 + Math.random() * 0.4));
    }, speed);

    colorTimerRef.current = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % colors.length);
    }, 4000);

    return () => {
      clearInterval(interval);
      if (colorTimerRef.current) clearInterval(colorTimerRef.current);
    };
  }, []);

  return (
    <div
      className="scan-line"
      style={{
        top: `${position}%`,
        background: `linear-gradient(90deg, transparent, ${colors[colorIndex]}, transparent)`,
        boxShadow: `0 0 10px ${colors[colorIndex].replace("0.5", "0.3")}`,
        transition: "background 1s ease, box-shadow 1s ease",
        height: "2px",
        position: "fixed",
        left: 0,
        width: "100%",
        zIndex: 100,
        pointerEvents: "none",
      }}
    />
  );
}

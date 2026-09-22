"use client";
import { useEffect } from "react";

export default function CursorSparkles() {
  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const sparkle = document.createElement("span");
      sparkle.textContent = Math.random() > 0.5 ? "✦" : "•";
      sparkle.style.cssText = `position:fixed;left:${event.clientX + (Math.random() * 14 - 7)}px;top:${event.clientY + (Math.random() * 14 - 7)}px;z-index:9999;pointer-events:none;color:#C4A77D;font-size:${8 + Math.random() * 8}px;line-height:1;animation:lyjy-sparkle 700ms ease-out forwards;`;
      document.body.appendChild(sparkle);
      window.setTimeout(() => sparkle.remove(), 720);
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);
  return null;
}

"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/useThemeStore";
import { useCartStore } from "@/store/useCartStore";
import "./globals.css";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDayMode = useThemeStore((state) => state.isDayMode);
  const syncCart = useCartStore((state) => state.syncCart);

  // Synchronise et charge le bon panier dès le chargement de l'application
  useEffect(() => {
    syncCart();
  }, [syncCart]);

  return (
    <html lang="fr">
      <body className={`min-h-screen font-sans transition-colors duration-500 ${
        isDayMode ? "bg-[#F9F8F6] text-stone-900" : "bg-black text-stone-200"
      }`}>
        {children}
        <footer className="fixed bottom-0 left-0 right-0 z-20 flex justify-center gap-6 py-2 bg-black/90 text-[10px] uppercase tracking-widest text-stone-400"><Link href="/contact">Contact</Link><Link href="/cgv-cgu">CGV-CGU</Link></footer>
      </body>
    </html>
  );
}

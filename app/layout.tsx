"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/useThemeStore";
import { useCartStore } from "@/store/useCartStore";
import "./globals.css";
import Link from "next/link";
import GlobalAlert from "@/components/GlobalAlert";

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
      <head>
        <title>LYJY Atelier Bijoux</title>
        <meta name="description" content="Bijoux artisanaux et créations uniques faits main par LYJY Atelier." />
        <meta name="keywords" content="bijoux artisanaux, bijoux faits main, créations uniques, LYJY Atelier, colliers, bracelets, bagues" />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href="https://lyjy.fr/" />
        <meta property="og:title" content="LYJY Atelier Bijoux – Créations artisanales" />
        <meta property="og:description" content="Découvrez les bijoux artisanaux uniques de LYJY Atelier." />
        <meta property="og:url" content="https://lyjy.fr/" />
        <meta property="og:image" content="https://lyjy.fr/lyjy-banner-email.jpg" />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`min-h-screen font-sans transition-colors duration-500 ${
        isDayMode ? "bg-[#F9F8F6] text-stone-900" : "bg-black text-stone-200"
      }`}>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "Store", name: "LYJY Atelier Bijoux", url: "https://lyjy.fr/", logo: "https://lyjy.fr/logo.png", image: "https://lyjy.fr/lyjy-banner-email.jpg", description: "Bijoux artisanaux et créations uniques faits main par LYJY Atelier.", email: "contact-lyjy@lyjy.fr", address: { "@type": "PostalAddress", addressCountry: "FR" }
        }) }} />
        <GlobalAlert />
        <footer className="fixed bottom-0 left-0 right-0 z-20 flex justify-center gap-6 py-2 bg-black/90 text-[10px] uppercase tracking-widest text-stone-400"><Link href="/contact">Contact</Link><Link href="/cgv-cgu">CGV-CGU</Link></footer>
      </body>
    </html>
  );
}

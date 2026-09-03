"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useThemeStore } from "@/store/useThemeStore";

export default function Home() {
  const { isDayMode, toggleDayMode } = useThemeStore();
  const cartItems = useCartStore((state) => state.items);
  
  // Vérification stricte pour s'assurer que cartItems est bien un tableau
  const safeItems = Array.isArray(cartItems) ? cartItems : [];
  const totalItems = safeItems.reduce((sum, item) => sum + item.quantity, 0);

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Vérifier si un utilisateur est connecté dans le navigateur
  useEffect(() => {
    const user = localStorage.getItem("lyjy_current_user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  return (
    <main className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${
      isDayMode ? "bg-[#F9F8F6] text-stone-900" : "bg-black text-stone-200"
    }`}>
      
      <header className={`absolute top-0 left-0 z-20 w-full px-6 py-5 md:px-10 md:py-8 flex items-center justify-between transition-colors duration-500`}>
        <nav className={`flex items-center gap-8 text-xs tracking-[0.2em] uppercase font-light transition-colors duration-500 ${
          "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
        }`}>
          {currentUser ? (
            <Link href="/mon-compte" className="hover:text-[#C4A77D] transition-colors duration-300">
              Mon Compte ({currentUser.firstName})
            </Link>
          ) : (
            <>
              <Link href="/connexion" className="hover:text-[#C4A77D] transition-colors duration-300">
                Connexion
              </Link>
              <Link href="/inscription" className="hover:text-[#C4A77D] transition-colors duration-300">
                Inscription
              </Link>
            </>
          )}
        </nav>

        <div className="absolute left-1/2 -translate-x-1/2 top-2 md:top-3">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="LYJY Atelier Bijoux"
              width={230}
              height={85}
              className="object-contain opacity-95 hover:opacity-100 transition-opacity"
              priority
            />
          </Link>
        </div>

        <div className={`flex items-center gap-8 text-xs tracking-[0.2em] uppercase font-light transition-colors duration-500 ${
          "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
        }`}>
          <button 
            onClick={toggleDayMode}
            className="flex items-center gap-2 cursor-pointer group focus:outline-none"
          >
            {isDayMode ? (
              <Moon className="w-4 h-4 text-stone-700 group-hover:text-[#C4A77D] transition-colors" />
            ) : (
              <Sun className="w-4 h-4 text-yellow-500 group-hover:text-[#C4A77D] transition-colors" />
            )}
            <span className={isDayMode ? "text-stone-800" : "text-stone-300"}>
              {isDayMode ? "Mode Nuit" : "Mode Jour"}
            </span>
          </button>
          <Link href="/panier" className="hover:text-[#C4A77D] transition-colors duration-300">
            Panier ({totalItems})
          </Link>
        </div>
      </header>

      <section className="hero-readable flex-grow flex flex-col items-center justify-center text-center px-4 py-28 md:py-36 bg-cover bg-center relative" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.36), rgba(0,0,0,0.5)), url('/lyjy-banner-new.jpg')" }}>
        <h1 
          className="font-serif mb-5 tracking-[0.25em] text-[#C4A77D] whitespace-nowrap"
          style={{ fontSize: 'clamp(1.5rem, 3.2vw, 3.2rem)' }}
        >
          LYJY ATELIER BIJOUX
        </h1>

        <p className={`text-xs md:text-sm tracking-[0.4em] uppercase mb-14 font-light max-w-2xl mx-auto transition-colors duration-500 ${
          isDayMode ? "text-stone-800" : "text-white/90"
        }`}>
          L'excellence de l'artisanat
        </p>

        <div className={`w-16 h-px mb-16 transition-colors duration-500 ${
          isDayMode ? "bg-stone-300" : "bg-stone-800/70"
        }`}></div>

        <div className={`max-w-3xl mb-12 text-center font-serif text-sm md:text-base leading-loose tracking-[0.08em] ${isDayMode ? "text-stone-700" : "text-stone-300"}`}>
          <p className="text-lg md:text-xl text-[#C4A77D] mb-5 tracking-[0.3em] uppercase">Bonjour, je m'appelle Jennifer.</p>
          <p className="italic text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">La création de bijoux est pour moi une véritable passion. Ce qui m'anime chaque jour, c’est le pur plaisir de confectionner de mes propres mains des pièces uniques pour chacun de vous.</p>
          <p className="mt-4 italic text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Plus qu'un simple accessoire, je vois le bijou comme une source de joie et un moyen de participer au bonheur de mes clients. Savoir que mes créations vous accompagnent dans vos moments précieux ou illuminent votre quotidien est la plus belle des récompenses.</p>
          <p className="mt-5 text-[#C4A77D] tracking-[0.3em] uppercase">Bienvenue dans mon univers !</p>
        </div>

        <Link
          href="/boutique"
          className={`group border border-[#C4A77D] text-[#C4A77D] px-12 py-4 text-xs tracking-[0.3em] uppercase 
                     hover:bg-[#C4A77D] hover:text-black transition-all duration-500 ease-in-out font-light`}
        >
          Découvrir la collection
        </Link>
        <div className={`mt-16 max-w-4xl text-center text-sm leading-relaxed ${isDayMode ? "text-stone-700" : "text-stone-300"}`}>
          <h2 className="font-serif text-xl tracking-[0.18em] text-[#C4A77D]">Bijoux artisanaux faits main</h2>
          <p className="mt-4">Découvrez les créations uniques de LYJY Atelier : colliers, bracelets, bagues et bijoux personnalisés imaginés pour offrir ou se faire plaisir. Chaque pièce est confectionnée avec passion en petite série.</p>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";
import { useCartStore } from "@/store/useCartStore";
import { loginCustomer } from "@/lib/customerAuth";

export default function LoginPage() {
  const { isDayMode, toggleDayMode } = useThemeStore();

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    setIsSubmitting(true);
    try {
      const guestCart = localStorage.getItem("lyjy_cart_guest");
      await loginCustomer(email, password);
      if (guestCart) {
        const userData = JSON.parse(localStorage.getItem("lyjy_current_user") || "{}");
        const userKey = userData.email ? `lyjy_cart_${userData.email}` : "";
        if (userKey && !localStorage.getItem(userKey)) localStorage.setItem(userKey, guestCart);
        localStorage.removeItem("lyjy_cart_guest");
      }
      useCartStore.getState().syncCart();
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      router.push(returnTo || "/mon-compte");
    } catch {
      setError("E-mail ou mot de passe incorrect, ou compte inexistant.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className={`min-h-screen flex flex-col font-sans px-6 py-6 md:px-16 transition-colors duration-500 ${
        isDayMode
          ? "bg-[#F9F8F6] text-stone-900"
          : "bg-black text-stone-200"
      }`}
    >
      <header
        className={`flex items-center justify-between border-b pb-6 mb-10 transition-colors duration-500 ${
          isDayMode
            ? "border-stone-200"
            : "border-stone-900"
        }`}
      >
        <Link
          href="/"
          className={`flex items-center gap-2 text-xs tracking-widest uppercase transition-colors ${
            isDayMode
              ? "text-stone-600 hover:text-[#C4A77D]"
              : "text-stone-400 hover:text-[#C4A77D]"
          }`}
        >
          Accueil
        </Link>

        <h1 className="text-lg font-serif tracking-[0.2em] text-[#C4A77D]">
          Espace Client
        </h1>

        <button
          type="button"
          onClick={toggleDayMode}
          className="flex items-center gap-2 cursor-pointer group focus:outline-none text-xs tracking-[0.2em] uppercase font-light"
        >
          {isDayMode ? (
            <Moon className="w-4 h-4 text-stone-700 group-hover:text-[#C4A77D] transition-colors" />
          ) : (
            <Sun className="w-4 h-4 text-yellow-500 group-hover:text-[#C4A77D] transition-colors" />
          )}

          <span
            className={
              isDayMode
                ? "text-stone-800"
                : "text-stone-300"
            }
          >
            {isDayMode ? "Mode Nuit" : "Mode Jour"}
          </span>
        </button>
      </header>

      <div className="flex-grow flex items-center justify-center py-10">
        <div
          className={`p-8 md:p-12 border max-w-md w-full space-y-8 transition-colors duration-500 ${
            isDayMode
              ? "bg-stone-100 border-stone-200 shadow-sm"
              : "bg-stone-950 border-stone-900"
          }`}
        >
          <div className="text-center space-y-2">
            <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D]">
              CONNEXION
            </h2>

            <p className="text-xs text-stone-500 tracking-wider">
              Accédez à votre historique et suivi de commandes
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 text-center tracking-wider">
              {error}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="block text-xs tracking-widest uppercase text-stone-500">
                Adresse e-mail
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                autoComplete="email"
                className={`w-full p-3 text-sm border focus:outline-none focus:border-[#C4A77D] transition-colors ${
                  isDayMode
                    ? "bg-white border-stone-300 text-stone-900"
                    : "bg-black border-stone-800 text-stone-100"
                }`}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs tracking-widest uppercase text-stone-500">
                Mot de passe
              </label>

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`w-full p-3 text-sm border focus:outline-none focus:border-[#C4A77D] transition-colors ${
                  isDayMode
                    ? "bg-white border-stone-300 text-stone-900"
                    : "bg-black border-stone-800 text-stone-100"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#C4A77D] text-black py-4 text-xs tracking-[0.3em] uppercase hover:bg-[#b3956c] transition-colors font-light disabled:opacity-50"
            >
              {isSubmitting ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-stone-900/50">
            <p className="text-xs text-stone-500 tracking-wider">
              Pas encore de compte ?{" "}
              <Link
                href="/inscription"
                className="text-[#C4A77D] hover:underline uppercase tracking-widest ml-1"
              >
                S&apos;inscrire
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

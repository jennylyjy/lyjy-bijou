"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";
import { registerCustomer } from "@/lib/customerAuth";
import { useCartStore } from "@/store/useCartStore";

export default function RegisterPage() {
  const { isDayMode, toggleDayMode } = useThemeStore();
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    street: "",
    postalCode: "",
    city: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  useEffect(() => {
    if (formData.street.length < 3) return setAddressSuggestions([]);
    const timer = setTimeout(async () => { try { const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(formData.street)}&limit=5`); const data = await response.json(); setAddressSuggestions(data.features || []); } catch { setAddressSuggestions([]); } }, 300);
    return () => clearTimeout(timer);
  }, [formData.street]);
  const selectAddress = (feature: any) => { const props = feature.properties || {}; setFormData(prev => ({ ...prev, street: props.name || prev.street, postalCode: props.postcode || prev.postalCode, city: props.city || prev.city })); setAddressSuggestions([]); };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!acceptedTerms) { setError("Vous devez accepter les CGV-CGU."); return; }

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (formData.password.length < 8 || !/[A-Za-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      setError("Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerCustomer({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        addressDetails: { street: formData.street, postalCode: formData.postalCode, city: formData.city },
      }, formData.password);
      useCartStore.getState().syncCart();
      alert("Un e-mail de validation vient de vous être envoyé. Validez votre adresse pour pouvoir vous reconnecter.");
      router.push("/mon-compte");
    } catch {
      setError("Impossible de créer le compte. Cette adresse e-mail est peut-être déjà utilisée.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={`min-h-screen flex flex-col font-sans px-6 py-6 md:px-16 transition-colors duration-500 ${
      isDayMode ? "bg-[#F9F8F6] text-stone-900" : "bg-black text-stone-200"
    }`}>
      <header className={`flex items-center justify-between border-b pb-6 mb-10 transition-colors duration-500 ${
        isDayMode ? "border-stone-200" : "border-stone-900"
      }`}>
        <Link href="/" className={`flex items-center gap-2 text-xs tracking-widest uppercase transition-colors ${
          isDayMode ? "text-stone-600 hover:text-[#C4A77D]" : "text-stone-400 hover:text-[#C4A77D]"
        }`}>
          <ArrowLeft className="w-4 h-4" /> Accueil
        </Link>
        
        <h1 className="text-lg font-serif tracking-[0.2em] text-[#C4A77D]">Création de Compte</h1>

        <button 
          onClick={toggleDayMode}
          className="flex items-center gap-2 cursor-pointer group focus:outline-none text-xs tracking-[0.2em] uppercase font-light"
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
      </header>

      <div className="flex-grow flex items-center justify-center py-10">
        <div className={`p-8 md:p-12 border max-w-lg w-full space-y-8 transition-colors duration-500 ${
          isDayMode ? "bg-stone-100 border-stone-200 shadow-sm" : "bg-stone-950 border-stone-900"
        }`}>
          <div className="text-center space-y-2">
            <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D]">INSCRIPTION</h2>
            <p className="text-xs text-stone-500 tracking-wider">Créez votre profil pour suivre vos commandes et nouveautés</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 text-center tracking-wider">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs tracking-widest uppercase text-stone-500">Prénom</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Jean"
                  className={`w-full p-3 text-sm border focus:outline-none focus:border-[#C4A77D] transition-colors ${
                    isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"
                  }`}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs tracking-widest uppercase text-stone-500">Nom</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Dupont"
                  className={`w-full p-3 text-sm border focus:outline-none focus:border-[#C4A77D] transition-colors ${
                    isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"
                  }`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs tracking-widest uppercase text-stone-500">Adresse e-mail</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="votre@email.com"
                className={`w-full p-3 text-sm border focus:outline-none focus:border-[#C4A77D] transition-colors ${
                  isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"
                }`}
              />
            </div>

            <div className="space-y-2 relative"><label className="block text-xs tracking-widest uppercase text-stone-500">Adresse postale</label><input type="text" name="street" required value={formData.street} onChange={handleChange} placeholder="12 rue des Fleurs" autoComplete="street-address" className={`w-full p-3 text-sm border ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`} />{addressSuggestions.length > 0 && <div className="absolute z-10 w-full border border-stone-700 bg-stone-950">{addressSuggestions.map((feature, index) => <button type="button" key={feature.properties?.id || index} onClick={() => selectAddress(feature)} className="block w-full text-left p-2 text-xs hover:bg-stone-800">{feature.properties?.label}</button>)}</div>}</div>
            <div className="grid grid-cols-2 gap-4"><input type="text" name="postalCode" required pattern="[0-9]{5}" value={formData.postalCode} onChange={handleChange} placeholder="75001" className="w-full p-3 text-sm border bg-black border-stone-800" /><input type="text" name="city" required value={formData.city} onChange={handleChange} placeholder="Paris" className="w-full p-3 text-sm border bg-black border-stone-800" /></div>

            <div className="space-y-2">
              <label className="block text-xs tracking-widest uppercase text-stone-500">Mot de passe</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full p-3 text-sm border focus:outline-none focus:border-[#C4A77D] transition-colors ${
                  isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"
                }`}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs tracking-widest uppercase text-stone-500">Confirmer le mot de passe</label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full p-3 text-sm border focus:outline-none focus:border-[#C4A77D] transition-colors ${
                  isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"
                }`}
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-stone-500"><input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} required /> J’accepte les <Link href="/cgv-cgu" className="text-[#C4A77D] underline">CGV-CGU</Link>.</label>
            <button
              type="submit"
              className="w-full bg-[#C4A77D] text-black py-4 text-xs tracking-[0.3em] uppercase hover:bg-[#b3956c] transition-colors font-light mt-4"
            >
              Créer mon compte
            </button>
          </form>

          <div className="text-center pt-4 border-t border-stone-900/50">
            <p className="text-xs text-stone-500 tracking-wider">
              Déjà un compte ?{" "}
              <Link href="/connexion" className="text-[#C4A77D] hover:underline uppercase tracking-widest ml-1">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

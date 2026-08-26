import Link from "next/link";
import { Lock, Shield } from "lucide-react";
import type { FormEvent } from "react";

type Props = { isDayMode: boolean; error: string; email: string; password: string; onEmail: (value: string) => void; onPassword: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void };

export default function AdminLoginPanel({ isDayMode, error, email, password, onEmail, onPassword, onSubmit }: Props) {
  const field = `w-full p-3 border text-sm ${isDayMode ? "bg-stone-50 border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`;
  return <main className={`min-h-screen flex items-center justify-center p-6 ${isDayMode ? "bg-[#F9F8F6]" : "bg-black"}`}>
    <div className={`p-8 border max-w-md w-full space-y-6 ${isDayMode ? "bg-white border-stone-300" : "bg-stone-950 border-stone-900"}`}>
      <div className="text-center space-y-2"><Shield className="w-10 h-10 text-[#C4A77D] mx-auto" /><h1 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D]">Espace Administrateur</h1><p className="text-xs text-stone-500 uppercase tracking-widest">LYJY Atelier Bijoux</p></div>
      {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-4 text-xs">
        <label className="block uppercase text-stone-500">E-mail Admin<input type="email" required value={email} onChange={e => onEmail(e.target.value)} className={field} /></label>
        <label className="block uppercase text-stone-500">Mot de passe<input type="password" required value={password} onChange={e => onPassword(e.target.value)} className={field} /></label>
        <button type="submit" className="w-full bg-[#C4A77D] text-black py-3 text-xs tracking-[0.3em] uppercase flex items-center justify-center gap-2"><Lock className="w-4 h-4" /> Se Connecter</button>
      </form>
      <div className="text-center pt-4"><Link href="/" className="text-xs text-stone-500 hover:text-[#C4A77D] uppercase tracking-widest">← Retour à la boutique</Link></div>
    </div>
  </main>;
}

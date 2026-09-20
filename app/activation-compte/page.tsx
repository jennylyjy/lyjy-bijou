"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { registerCustomer } from "@/lib/customerAuth";

export default function ActivateAccountPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [customer, setCustomer] = useState<any>(null);
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const inviteToken = new URLSearchParams(window.location.search).get("invite") || "";
    setToken(inviteToken);
    if (!inviteToken) { setError("Lien d’activation invalide."); setLoading(false); return; }
    getDoc(doc(db, "pendingCustomers", inviteToken)).then(snapshot => {
      if (!snapshot.exists()) setError("Cette invitation est invalide ou a déjà été utilisée.");
      else setCustomer(snapshot.data());
    }).catch(() => setError("Impossible de vérifier cette invitation.")).finally(() => setLoading(false));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (!customer) return;
    if (emailConfirmation.trim().toLowerCase() !== String(customer.email).toLowerCase()) return setError("La confirmation de l’adresse e-mail est incorrecte.");
    if (password !== passwordConfirmation) return setError("Les mots de passe ne correspondent pas.");
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return setError("Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.");
    if (!acceptedTerms) return setError("Vous devez accepter les CGV-CGU.");
    setSubmitting(true);
    try {
      await registerCustomer({ email: customer.email, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone, addressDetails: { street: customer.street, postalCode: customer.postalCode, city: customer.city } }, password);
      alert("Votre compte est activé. Vous pouvez maintenant vous connecter.");
      router.push("/connexion");
    } catch { setError("Impossible d’activer le compte. Cette adresse e-mail est peut-être déjà utilisée."); }
    finally { setSubmitting(false); }
  };

  return <main className="min-h-screen bg-black px-6 py-10 text-stone-200"><div className="mx-auto max-w-xl border border-stone-900 bg-stone-950 p-8 md:p-12"><div className="mb-8 text-center"><img src="/logo.png" alt="LYJY" className="mx-auto mb-5 h-20 w-20 object-contain" /><h1 className="font-serif text-2xl tracking-[0.15em] text-[#C4A77D]">Activer mon compte LYJY</h1><p className="mt-2 text-sm text-stone-500">Confirmez votre e-mail et choisissez votre mot de passe.</p></div>{loading ? <p className="text-center text-stone-500">Vérification de votre invitation...</p> : error && !customer ? <div className="border border-red-500/30 bg-red-500/10 p-4 text-center text-red-300">{error}</div> : <form onSubmit={submit} className="space-y-5">{error && <div className="border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}<div className="grid grid-cols-2 gap-3"><label className="text-xs uppercase tracking-widest text-stone-500">Prénom<input readOnly value={customer.firstName || ""} className="mt-1 w-full border border-stone-800 bg-black p-3 text-sm normal-case tracking-normal text-stone-300" /></label><label className="text-xs uppercase tracking-widest text-stone-500">Nom<input readOnly value={customer.lastName || ""} className="mt-1 w-full border border-stone-800 bg-black p-3 text-sm normal-case tracking-normal text-stone-300" /></label></div><label className="block text-xs uppercase tracking-widest text-stone-500">Adresse e-mail enregistrée<input readOnly value={customer.email || ""} className="mt-1 w-full border border-stone-800 bg-black p-3 text-sm text-stone-300" /></label><label className="block text-xs uppercase tracking-widest text-stone-500">Confirmer l’adresse e-mail<input required type="email" value={emailConfirmation} onChange={event => setEmailConfirmation(event.target.value)} className="mt-1 w-full border border-[#C4A77D] bg-black p-3 text-sm" /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs uppercase tracking-widest text-stone-500">Téléphone<input readOnly value={customer.phone || "—"} className="mt-1 w-full border border-stone-800 bg-black p-3 text-sm normal-case tracking-normal text-stone-300" /></label><label className="text-xs uppercase tracking-widest text-stone-500">Code postal<input readOnly value={customer.postalCode || "—"} className="mt-1 w-full border border-stone-800 bg-black p-3 text-sm normal-case tracking-normal text-stone-300" /></label></div><label className="block text-xs uppercase tracking-widest text-stone-500">Mot de passe<input required type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="8 caractères minimum" className="mt-1 w-full border border-[#C4A77D] bg-black p-3 text-sm" /></label><label className="block text-xs uppercase tracking-widest text-stone-500">Confirmer le mot de passe<input required type="password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} className="mt-1 w-full border border-[#C4A77D] bg-black p-3 text-sm" /></label><label className="flex items-start gap-2 text-xs text-stone-500"><input type="checkbox" checked={acceptedTerms} onChange={event => setAcceptedTerms(event.target.checked)} /> J’accepte les <Link href="/cgv-cgu" className="text-[#C4A77D] underline">CGV-CGU</Link>.</label><button disabled={submitting} className="w-full bg-[#C4A77D] py-4 text-sm uppercase tracking-widest text-black">{submitting ? "Activation..." : "Activer mon compte"}</button></form>}</div></main>;
}

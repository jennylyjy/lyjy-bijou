"use client";
import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";
export default function FavorisPage() {
  const ids = typeof window === "undefined" ? [] : JSON.parse(localStorage.getItem("lyjy-favorites") || "[]");
  return <main className="min-h-screen bg-black px-6 py-10 text-stone-200"><div className="mx-auto max-w-5xl"><Link href="/boutique" className="mb-8 inline-flex items-center gap-2 text-sm text-[#C4A77D]"><ArrowLeft className="h-4 w-4" /> Retour boutique</Link><h1 className="mb-4 flex items-center gap-3 font-serif text-3xl text-[#C4A77D]"><Heart /> Mes favoris</h1>{ids.length ? <p className="text-stone-500">Tes favoris sont conservés sur cet appareil. Ouvre la boutique pour les consulter.</p> : <p className="text-stone-500">Aucun favori pour le moment.</p>}</div></main>;
}

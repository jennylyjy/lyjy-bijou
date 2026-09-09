"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { defaultCatalogTaxonomy, CatalogTaxonomy, TaxonomyKey, taxonomyLabels } from "@/lib/catalogTaxonomy";
import { ShoppingBag, UserRound, LogIn, UserPlus, RotateCcw } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

const filterKeys: TaxonomyKey[] = ["categories", "subcategories", "themes", "colors"];

export default function SiteSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cartItems = useCartStore((state) => state.items);
  const [user, setUser] = useState(auth.currentUser);
  const [taxonomy, setTaxonomy] = useState<CatalogTaxonomy>(defaultCatalogTaxonomy);
  const visible = pathname !== "/" && pathname !== "/mon-compte" && !pathname.startsWith("/admin");

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => onSnapshot(doc(db, "settings", "catalogTaxonomy"), (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    setTaxonomy({ categories: data.categories || [], subcategories: data.subcategories || [], themes: data.themes || [], colors: data.colors || [] });
  }), []);

  if (!visible) return null;
  const totalItems = (Array.isArray(cartItems) ? cartItems : []).reduce((sum, item) => sum + item.quantity, 0);
  const setFilter = (key: TaxonomyKey, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/boutique?${params.toString()}`);
  };
  const clearFilters = () => router.push("/boutique");

  return <aside className="fixed left-0 top-0 bottom-0 z-40 hidden w-64 overflow-y-auto border-r border-stone-800 bg-black px-5 py-7 text-stone-300 lg:block">
    <Link href="/boutique" className="mb-8 flex justify-center"><img src="/logo.png" alt="LYJY" className="h-24 w-24 object-contain" /></Link>
    <div className="space-y-2 border-b border-stone-800 pb-5">
      <Link href="/boutique" className="flex items-center gap-2 border border-[#C4A77D] px-3 py-3 text-xs uppercase tracking-widest text-[#C4A77D]"><RotateCcw className="h-4 w-4" /> Toute la boutique</Link>
      {user ? <Link href="/mon-compte" className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest hover:text-[#C4A77D]"><UserRound className="h-4 w-4" /> Mon compte</Link> : <>
        <Link href="/connexion" className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest hover:text-[#C4A77D]"><LogIn className="h-4 w-4" /> Connexion</Link>
        <Link href="/inscription" className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest hover:text-[#C4A77D]"><UserPlus className="h-4 w-4" /> Inscription</Link>
      </>}
      <Link href="/panier" className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest hover:text-[#C4A77D]"><ShoppingBag className="h-4 w-4" /> Panier ({totalItems})</Link>
    </div>
    <div className="space-y-2 py-5">
      <p className="px-3 text-[10px] uppercase tracking-[0.25em] text-stone-500">Filtres</p>
      {filterKeys.map((key) => <div key={key} className="border-b border-stone-900 pb-3">
        <p className="px-3 py-3 text-xs uppercase tracking-widest text-[#C4A77D]">{taxonomyLabels[key]}</p>
        <div className="space-y-1 px-3"><button type="button" onClick={() => setFilter(key, "all")} className="block w-full py-1 text-left text-xs text-stone-300 hover:text-[#C4A77D]">Tous</button>{taxonomy[key].filter(item => item.isVisible).map(item => <button type="button" key={item.id} onClick={() => setFilter(key, item.id)} className={`block w-full py-1 text-left text-xs hover:text-[#C4A77D] ${searchParams.get(key) === item.id ? "text-[#C4A77D]" : "text-stone-400"}`}>{item.label}</button>)}</div>
      </div>)}
    </div>
    <div className="space-y-3 border-t border-stone-800 pt-5 text-xs uppercase tracking-widest"><Link href="/contact" className="block hover:text-[#C4A77D]">Contact</Link><Link href="/cgv-cgu" className="block hover:text-[#C4A77D]">CGV-CGU</Link></div>
  </aside>;
}

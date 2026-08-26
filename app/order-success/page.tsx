"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ArrowLeft, ShoppingBag } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCartStore } from "@/store/useCartStore";

export default function OrderSuccessPage() {
  const { isDayMode } = useThemeStore();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const stripeSession = new URLSearchParams(window.location.search).has("session_id");
    if (stripeSession) {
      const storedUser = JSON.parse(localStorage.getItem("lyjy_current_user") || "null");
      const cartKey = storedUser?.email ? `lyjy_cart_${storedUser.email}` : "lyjy_cart_guest";
      const rawCart = localStorage.getItem(cartKey);
      fetch(`/api/stripe/session?session_id=${encodeURIComponent(new URLSearchParams(window.location.search).get("session_id") || "")}`).then(response => response.json()).then(async payment => { if (!payment.paid || !rawCart) return; const items = JSON.parse(rawCart); const created = { id: `CMD-${Date.now().toString().slice(-6)}`, clientName: storedUser ? `${storedUser.firstName || ""} ${storedUser.lastName || ""}`.trim() || "Client" : "Client Invité", clientEmail: payment.email || storedUser?.email || "", status: "preparing", total: payment.amount, items, date: new Date().toLocaleDateString("fr-FR"), createdAt: new Date().toISOString() }; await addDoc(collection(db, "orders"), created); setOrder(created); localStorage.removeItem(cartKey); useCartStore.getState().resetCart(); localStorage.removeItem("lyjy_last_order"); }).catch(() => undefined);
      return;
    }
    const savedOrder = localStorage.getItem("lyjy_last_order");
    if (savedOrder) {
      try {
        setOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error("Erreur lecture commande :", e);
      }
    }
  }, []);

  return (
    <main className={`min-h-screen flex flex-col font-sans px-6 py-12 md:px-16 items-center justify-center transition-colors duration-500 ${
      isDayMode ? "bg-[#F9F8F6] text-stone-900" : "bg-black text-stone-200"
    }`}>
      <div className="max-w-xl w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#C4A77D]/10 border border-[#C4A77D]/30 flex items-center justify-center text-[#C4A77D]">
            <Check className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-2xl tracking-[0.2em] text-[#C4A77D]">Commande Validée avec Succès</h1>
          <p className="text-xs text-stone-500 uppercase tracking-widest">
            Merci pour votre achat. Votre commande a bien été transmise à notre atelier et est en cours de préparation.
          </p>
        </div>

        {order ? (
          <div className={`p-6 border text-left space-y-6 text-xs tracking-wider ${
            isDayMode ? "bg-white border-stone-200" : "bg-stone-950 border-stone-900"
          }`}>
            <div className="flex justify-between border-b border-stone-800 pb-4">
              <div>
                <span className="text-stone-500 block uppercase text-[10px]">N° de commande</span>
                <span className="font-serif text-sm text-[#C4A77D]">{order.id}</span>
              </div>
              <div className="text-right">
                <span className="text-stone-500 block uppercase text-[10px]">Date</span>
                <span>{order.date || new Date().toLocaleDateString("fr-FR")}</span>
              </div>
            </div>

            <div>
              <span className="text-stone-500 block uppercase text-[10px] mb-2">Récapitulatif des articles</span>
              <ul className="space-y-3">
                {order.items?.map((item: any, idx: number) => (
                  <li key={idx} className="flex flex-col space-y-1 border-b border-stone-800/50 pb-2 last:border-none">
                    <div className="flex justify-between font-medium">
                      <span>{item.name || item.title} (x{item.quantity})</span>
                      <span className="font-light">{(item.price * item.quantity).toFixed(2)} €</span>
                    </div>

                    {/* AFFICHAGE DES OPTIONS DU CALENDRIER SUR LA PAGE DE SUCCÈS */}
                    {item.options && (
                      <div className="text-[11px] space-y-0.5 border-l-2 border-[#C4A77D] pl-2 py-0.5 text-stone-400">
                        {item.options.formule && (
                          <p><span className="text-stone-500 uppercase">Formule :</span> {item.options.formule}</p>
                        )}
                        {item.options.finition && (
                          <p><span className="text-stone-500 uppercase">Finition :</span> {item.options.finition}</p>
                        )}
                        {item.options.categories && item.options.categories.length > 0 && (
                          <p>
                            <span className="text-stone-500 uppercase">Choix :</span>{" "}
                            {item.options.categories.join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-stone-800 pt-4">
              <span className="text-stone-500 block uppercase text-[10px] mb-1">Adresse de livraison</span>
              <p className="text-stone-300">
                {order.address?.street || "Adresse non renseignée"}<br />
                {order.address?.postalCode || ""} {order.address?.city || ""}
              </p>
            </div>

            <div className="border-t border-stone-800 pt-4 flex justify-between font-serif text-sm text-[#C4A77D]">
              <span>Total payé</span>
              <span>{typeof order.total === 'number' ? order.total.toFixed(2) + ' €' : order.total}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-stone-500 italic">Chargement des détails de la commande...</p>
        )}

        <div>
          <Link 
            href="/boutique" 
            className="inline-flex items-center gap-2 border border-[#C4A77D] text-[#C4A77D] px-6 py-3 text-xs tracking-[0.3em] uppercase hover:bg-[#C4A77D] hover:text-black transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à la boutique
          </Link>
        </div>
      </div>
    </main>
  );
}

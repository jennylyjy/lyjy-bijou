"use client";

import { useState } from "react";
import { Gift, Mail, Truck } from "lucide-react";

interface GiftCardArticle {
  giftCardConfig?: { minAmount?: number; maxAmount?: number };
}

interface GiftCardOptions {
  giftCard: true;
  deliveryType: "virtual" | "physical";
  amount: number;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  message: string;
  shippingAddress?: {
    street: string;
    complement: string;
    postalCode: string;
    city: string;
    country: string;
  };
}

export default function GiftCardConfigurator({
  article,
  isDayMode,
  onAddToCart,
}: {
  article: GiftCardArticle;
  isDayMode: boolean;
  onAddToCart: (options: GiftCardOptions) => void;
}) {
  const minAmount = Number(article.giftCardConfig?.minAmount) || 10;
  const maxAmount = Number(article.giftCardConfig?.maxAmount) || 500;
  const [amount, setAmount] = useState(String(minAmount));
  const [deliveryType, setDeliveryType] = useState<"virtual" | "physical">("virtual");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [street, setStreet] = useState("");
  const [complement, setComplement] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("France");
  const numericAmount = Number(amount);
  const hasDeliveryDetails = deliveryType === "virtual"
    ? Boolean(recipientEmail.trim())
    : Boolean(street.trim() && postalCode.trim() && city.trim() && country.trim());
  const isValid = Boolean(numericAmount >= minAmount && numericAmount <= maxAmount && recipientName.trim() && senderName.trim() && hasDeliveryDetails);
  const fieldClass = `w-full border p-3 text-sm focus:border-[#C4A77D] focus:outline-none ${
    isDayMode ? "border-stone-300 bg-white text-stone-900" : "border-stone-800 bg-black text-stone-100"
  }`;

  return (
    <form
      className={`space-y-4 rounded-2xl border p-6 ${isDayMode ? "border-stone-200 bg-white" : "border-stone-800 bg-stone-900"}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!isValid) return;
        onAddToCart({
          giftCard: true,
          deliveryType,
          amount: numericAmount,
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim().toLowerCase(),
          senderName: senderName.trim(),
          message: message.trim(),
          shippingAddress: deliveryType === "physical" ? {
            street: street.trim(),
            complement: complement.trim(),
            postalCode: postalCode.trim(),
            city: city.trim(),
            country: country.trim(),
          } : undefined,
        });
      }}
    >
      <h3 className="flex items-center gap-2 font-serif text-xl text-[#C4A77D]">
        <Gift className="h-5 w-5" /> Personnalisez votre carte cadeau
      </h3>

      <div>
        <label className="mb-2 block text-[10px] uppercase text-stone-500">Format de la carte</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDeliveryType("virtual")}
            className={`flex flex-col items-center gap-2 border p-4 text-center ${deliveryType === "virtual" ? "border-[#C4A77D] bg-[#C4A77D]/10 text-[#C4A77D]" : "border-stone-700 text-stone-500"}`}
          >
            <Mail className="h-5 w-5" />
            <span className="text-[10px] uppercase">Virtuelle par e-mail</span>
          </button>
          <button
            type="button"
            onClick={() => setDeliveryType("physical")}
            className={`flex flex-col items-center gap-2 border p-4 text-center ${deliveryType === "physical" ? "border-[#C4A77D] bg-[#C4A77D]/10 text-[#C4A77D]" : "border-stone-700 text-stone-500"}`}
          >
            <Truck className="h-5 w-5" />
            <span className="text-[10px] uppercase">Physique par courrier</span>
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] uppercase text-stone-500">Montant de la carte</label>
        <div className="relative">
          <input type="number" min={minAmount} max={maxAmount} step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} className={fieldClass} />
          <span className="absolute right-3 top-3 text-[#C4A77D]">€</span>
        </div>
        <p className="mt-1 text-[9px] text-stone-500">Entre {minAmount} € et {maxAmount} €</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] uppercase text-stone-500">Nom du destinataire</label>
          <input required value={recipientName} onChange={(event) => setRecipientName(event.target.value)} className={fieldClass} />
        </div>
        {deliveryType === "virtual" && (
          <div>
            <label className="mb-1 block text-[10px] uppercase text-stone-500">E-mail du destinataire</label>
            <input type="email" required value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} className={fieldClass} />
          </div>
        )}
      </div>

      {deliveryType === "physical" && (
        <div className="space-y-3 border border-[#C4A77D]/30 bg-[#C4A77D]/5 p-4">
          <h4 className="flex items-center gap-2 text-[10px] uppercase text-[#C4A77D]"><Truck className="h-4 w-4" /> Adresse d&apos;expédition du destinataire</h4>
          <input required placeholder="Adresse" value={street} onChange={(event) => setStreet(event.target.value)} className={fieldClass} />
          <input placeholder="Complément d'adresse (optionnel)" value={complement} onChange={(event) => setComplement(event.target.value)} className={fieldClass} />
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Code postal" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} className={fieldClass} />
            <input required placeholder="Ville" value={city} onChange={(event) => setCity(event.target.value)} className={fieldClass} />
          </div>
          <input required placeholder="Pays" value={country} onChange={(event) => setCountry(event.target.value)} className={fieldClass} />
          <p className="text-[9px] text-stone-500">Cette carte sera préparée à l&apos;atelier puis envoyée par courrier. Aucun e-mail cadeau ne sera envoyé.</p>
        </div>
      )}

      <div>
        <label className="mb-1 block text-[10px] uppercase text-stone-500">Offert par</label>
        <input required value={senderName} onChange={(event) => setSenderName(event.target.value)} className={fieldClass} />
      </div>

      <div>
        <label className="mb-1 block text-[10px] uppercase text-stone-500">Message personnalisé</label>
        <textarea rows={3} maxLength={300} value={message} onChange={(event) => setMessage(event.target.value)} className={fieldClass} placeholder="Votre petit mot..." />
        <p className="mt-1 text-right text-[9px] text-stone-500">{message.length}/300</p>
      </div>

      <button type="submit" disabled={!isValid} className="w-full bg-[#C4A77D] py-3.5 text-xs font-medium uppercase tracking-widest text-black disabled:cursor-not-allowed disabled:opacity-40">
        Ajouter la carte de {Number.isFinite(numericAmount) ? numericAmount : 0} € au panier
      </button>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { useThemeStore } from "@/store/useThemeStore";
import { useCartStore } from "@/store/useCartStore";
import { db } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, onSnapshot, query, where, serverTimestamp, getDocs } from "firebase/firestore";
import { auth } from "@/lib/firebase";
// 1. Import du composant configurateur
import CalendarConfigurator from "@/components/CalendarConfigurator";
import GiftCardConfigurator from "@/components/GiftCardConfigurator";

export default function ArticleDetailPage() {
  const { id } = useParams();
  const { isDayMode } = useThemeStore();
  const addItem = useCartStore((state) => state.addItem);

  const [article, setArticle] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewPhoto, setReviewPhoto] = useState("");
  const [verifiedBuyer, setVerifiedBuyer] = useState(false);
  const [relatedArticles, setRelatedArticles] = useState<any[]>([]);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    async function fetchArticle() {
      if (!id) return;
      try {
        const docRef = doc(db, "articles", String(id));
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as any;
          setArticle(data);
          setActiveImage(data.imageUrl || data.imageUrls?.[0] || "/logo.png");
          // Aucune variante n'est sélectionnée par défaut : le client voit d'abord la galerie générale.
          setSelectedVariant(null);
          const viewed = JSON.parse(localStorage.getItem("lyjy_recent_articles") || "[]").filter((item: any) => item.id !== docSnap.id);
          localStorage.setItem("lyjy_recent_articles", JSON.stringify([{ id: docSnap.id, title: data.title, imageUrl: data.imageUrl || data.imageUrls?.[0] || "/logo.png", price: data.finalPrice ?? data.price }, ...viewed].slice(0, 8)));
        }
      } catch (err) {
        console.error("Erreur chargement article :", err);
      } finally {
        setLoading(false);
      }
    }
    fetchArticle();
  }, [id]);

  useEffect(() => {
    if (!article) return;
    const title = String(article.seoTitle || article.title || "LYJY Atelier");
    const description = String(article.seoDescription || article.description || "Création artisanale LYJY Atelier Bijoux.").slice(0, 160);
    document.title = `${title} | LYJY Atelier`;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
    return () => {
      document.title = "LYJY Atelier Bijoux";
    };
  }, [article]);

  useEffect(() => { if (!id) return onSnapshot(query(collection(db, "reviews"), where("articleId", "==", String(id))), snap => setReviews(snap.docs.map(item => ({ id: item.id, ...item.data() })))); }, [id]);
  useEffect(() => { if (!auth.currentUser || !id) return; getDocs(query(collection(db, "orders"), where("clientEmail", "==", auth.currentUser.email || ""))).then(snap => setVerifiedBuyer(snap.docs.some(item => (item.data().items || []).some((product: any) => product.id === id)))).catch(() => undefined); }, [id]);
  const submitReview = async () => { if (!auth.currentUser || !reviewText.trim() || !id) return; await addDoc(collection(db, "reviews"), { articleId: String(id), userId: auth.currentUser.uid, userName: auth.currentUser.email?.split("@")[0] || "Client", rating: reviewRating, text: reviewText.trim(), photoUrl: reviewPhoto || null, verifiedPurchase: verifiedBuyer, createdAt: serverTimestamp() }); setReviewText(""); setReviewPhoto(""); };

  useEffect(() => {
    return onSnapshot(collection(db, "articles"), (snapshot) => {
      const categories = snapshot.docs
        .map(articleDoc => articleDoc.data())
        .filter(data => !data.isAdvent && data.category !== "calendrier-avent")
        .filter(data => data.isAvailable !== false && (Number(data.quantity) || 0) > 0)
        .map(data => String(data.category || "").toLowerCase())
        .filter(Boolean);

      setAvailableCategories(Array.from(new Set(categories)));
      if (article) setRelatedArticles(snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as any).filter((item: any) => item.id !== article.id && item.category === article.category && item.isAvailable !== false && Number(item.quantity) > 0).slice(0, 4));
    });
  }, []);

  // Ajout au panier standard (pour les bijoux classiques)
  const handleAddToCart = () => {
    if (!article) return;
    addItem({
      id: article.id,
      name: article.title,
      price: article.finalPrice ?? article.price,
      quantity: 1,
      image: selectedVariant?.imageUrl || article.imageUrl || "/logo.png",
      stock: Number(article.quantity) || 0,
      options: selectedVariant ? { variant: selectedVariant.label, size: selectedVariant.size || undefined, ref: selectedVariant.ref || undefined } : undefined
    });
    setSuccessMessage("Article ajouté au panier !");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // 2. Gestion de l'ajout au panier avec options personnalisées (pour le calendrier)
  const handleConfiguredAddToCart = (customOptions: any) => {
    if (!article) return;
    addItem({
      id: article.id,
      name: article.title,
      price: article.finalPrice ?? article.price,
      quantity: 1,
      image: article.imageUrl || "/logo.png",
      stock: Number(article.quantity) || 0,
      options: customOptions // Stocke la formule, la finition et les catégories choisies
    });
    setSuccessMessage("Calendrier personnalisé ajouté au panier !");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleGiftCardAddToCart = (customOptions: any) => {
    if (!article) return;
    addItem({
      id: article.id,
      name: `${article.title} — ${customOptions.recipientName}`,
      price: customOptions.amount,
      quantity: 1,
      image: article.imageUrl || "/logo.png",
      stock: Number(article.quantity) || 0,
      options: customOptions,
    });
    setSuccessMessage("Carte cadeau personnalisée ajoutée au panier !");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-[#C4A77D] font-serif">
        Chargement de l'article...
      </div>
    );
  }

  if (!article) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center space-y-4 ${isDayMode ? "bg-[#F9F8F6] text-stone-900" : "bg-black text-stone-200"}`}>
        <p className="uppercase tracking-widest text-xs">Article introuvable.</p>
        <Link href="/boutique" className="text-[#C4A77D] underline text-xs uppercase">Retour à la boutique</Link>
      </main>
    );
  }

  const imagesList = article.imageUrls && article.imageUrls.length > 0 ? article.imageUrls : [article.imageUrl || "/logo.png"];
  const variants = Array.isArray(article.variants) ? article.variants.filter((variant: any) => variant?.label && variant?.imageUrl && variant.isAvailable !== false) : [];
  const galleryImages = Array.from(new Set([...imagesList, ...variants.map((variant: any) => variant.imageUrl)]));
  const isCalendar = article.category?.toLowerCase() === "calendrier" || article.title?.toLowerCase().includes("calendrier");
  const isCustomGiftCard = article.isCustomGiftCard === true;

  return (
    <main className={`min-h-screen flex flex-col font-sans px-6 py-6 md:px-16 transition-colors duration-500 ${
      isDayMode ? "bg-[#F9F8F6] text-stone-900" : "bg-black text-stone-200"
    }`}>
      <header className={`flex items-center justify-between border-b pb-6 mb-10 ${isDayMode ? "border-stone-200" : "border-stone-800"}`}>
        <Link href="/boutique" className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-500 hover:text-[#C4A77D]">
          <ArrowLeft className="w-4 h-4" /> Retour boutique
        </Link>
        <h1 className="text-lg font-serif tracking-[0.2em] text-[#C4A77D]">LYJY ATELIER</h1>
      </header>

      {successMessage && (
        <div className="max-w-xl mx-auto mb-6 bg-green-500/15 border border-green-500/30 text-green-400 text-xs p-3 text-center flex items-center justify-center gap-2">
          <Check className="w-4 h-4" /> {successMessage}
        </div>
      )}

      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Galerie Photos */}
        <div className="space-y-4">
          <div className="aspect-square border border-stone-800 bg-stone-900 overflow-hidden">
            <button type="button" onClick={() => setZoomOpen(true)} className="w-full h-full cursor-zoom-in"><img src={activeImage} alt={article.title} loading="eager" decoding="async" className="w-full h-full object-cover" /></button>
          </div>
          {galleryImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {galleryImages.map((img: string, idx: number) => (
                <button 
                  key={idx} 
                  onClick={() => {
                    const matchingVariant = variants.find((variant: any) => variant.imageUrl === img);
                    setSelectedVariant(matchingVariant || null);
                    setActiveImage(img);
                  }}
                  className={`w-16 h-16 border flex-shrink-0 overflow-hidden transition-all ${!selectedVariant && activeImage === img ? "border-[#C4A77D] opacity-100" : "border-stone-800 opacity-60 hover:opacity-100"}`}
                >
                    <img src={img} alt="miniature" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {variants.length > 0 && (
            <div className="space-y-2">
              <p className="uppercase text-[10px] tracking-widest text-stone-500">Choisissez votre couleur / lettre</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => { setSelectedVariant(null); setActiveImage(imagesList[0] || "/logo.png"); }} className={`h-10 px-4 rounded-full border text-[10px] uppercase tracking-wider transition-all ${!selectedVariant ? "border-[#C4A77D] ring-2 ring-[#C4A77D]/30 text-[#C4A77D]" : "border-stone-700 text-stone-300 hover:border-[#C4A77D]"}`}>
                  Toutes les photos
                </button>
                {variants.map((variant: any) => (
                  <button type="button" key={`${variant.label}-${variant.imageUrl}`} onClick={() => { if (selectedVariant?.label === variant.label) { setSelectedVariant(null); setActiveImage(imagesList[0] || "/logo.png"); } else { setSelectedVariant(variant); setActiveImage(variant.imageUrl); } }} title={variant.label} className={`min-w-10 h-10 px-3 rounded-full border text-xs uppercase transition-all ${selectedVariant?.label === variant.label ? "border-[#C4A77D] ring-2 ring-[#C4A77D]/30 text-[#C4A77D]" : "border-stone-700 text-stone-300 hover:border-[#C4A77D]"}`}>
                    {variant.label}
                  </button>
                ))}
              </div>
              {selectedVariant && (selectedVariant.size || selectedVariant.label) && (
                <p className="text-xs text-stone-400">
                  Variante : <span className="text-[#C4A77D]">{selectedVariant.label}</span>
                  {selectedVariant.size && <> · Taille : <span className="text-[#C4A77D]">{selectedVariant.size}</span></>}
                  {selectedVariant.ref && <> · Réf. : <span className="text-[#C4A77D]">{selectedVariant.ref}</span></>}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Informations & Choix */}
        <div className="space-y-6 text-xs tracking-wider">
          <span className="uppercase text-stone-500 tracking-widest">{article.category}</span>
          <h1 className="font-serif text-2xl tracking-[0.15em] text-[#C4A77D]">{article.title}</h1>

          <div className="flex items-center gap-4 text-base font-serif">
            {isCustomGiftCard ? (
              <span className="text-[#C4A77D]">
                De {(Number(article.giftCardConfig?.minAmount) || Number(article.price) || 0).toFixed(2)} € à {(Number(article.giftCardConfig?.maxAmount) || Number(article.price) || 0).toFixed(2)} €
              </span>
            ) : article.reduction > 0 ? (
              <>
                <span className="line-through text-stone-500 text-sm">{article.price} €</span>
                <span className="text-[#C4A77D]">{article.finalPrice?.toFixed(2)} €</span>
                <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 uppercase border border-red-500/30">-{article.reduction}%</span>
              </>
            ) : (
              <span className={isDayMode ? "text-stone-900" : "text-stone-200"}>{article.price} €</span>
            )}
          </div>

          <div className="border-t border-stone-800 pt-4 space-y-2">
            <h3 className="uppercase text-stone-400 font-medium">Description</h3>
            <p className="text-stone-400 leading-relaxed font-sans">{article.description || "Aucune description pour le moment."}</p>
            {article.size && <p className="text-stone-400"><span className="uppercase text-[10px] tracking-widest text-stone-500">Taille :</span> {article.size}</p>}
          </div>

          {/* 3. Affichage conditionnel : Configurateur si Calendrier, sinon bouton classique */}
          {isCustomGiftCard ? (
            <GiftCardConfigurator
              article={article}
              isDayMode={isDayMode}
              onAddToCart={handleGiftCardAddToCart}
            />
          ) : isCalendar ? (
            <CalendarConfigurator 
              article={article}
              availableCategories={availableCategories}
              isDayMode={isDayMode} 
              onAddToCart={handleConfiguredAddToCart} 
            />
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={article.quantity <= 0}
              className="w-full bg-[#C4A77D] text-black py-4 uppercase tracking-[0.3em] font-medium hover:bg-[#b3956c] transition-colors disabled:opacity-50"
            >
              {article.quantity > 0 ? "Ajouter au panier" : "Rupture de stock"}
            </button>
          )}
        </div>
      </div>
      <section className="max-w-5xl mx-auto w-full mt-12 border-t border-stone-800 pt-8 space-y-5"><h2 className="font-serif text-xl text-[#C4A77D]">Avis clients ({reviews.length})</h2>{auth.currentUser && <div className="space-y-2"><div className="flex gap-2">{[1,2,3,4,5].map(value => <button type="button" key={value} onClick={() => setReviewRating(value)} className={value <= reviewRating ? "text-[#C4A77D] text-xl" : "text-stone-600 text-xl"}>★</button>)}</div>{verifiedBuyer && <p className="text-xs text-green-400">✓ Achat vérifié</p>}<textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Votre avis après votre achat" className="w-full p-3 bg-black border border-stone-700" /><input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setReviewPhoto(String(reader.result)); reader.readAsDataURL(file); }} className="text-xs" /><button type="button" onClick={submitReview} className="px-4 py-2 bg-[#C4A77D] text-black uppercase text-xs">Publier</button></div>}{reviews.map(review => <article key={review.id} className="border-b border-stone-800 pb-3"><div className="text-[#C4A77D]">{"★".repeat(review.rating || 0)}</div><p className="text-stone-300">{review.text}</p>{review.photoUrl && <img src={review.photoUrl} alt="Photo client" className="mt-2 h-24 w-24 object-cover" />}{review.verifiedPurchase && <small className="mr-2 text-green-400">✓ Achat vérifié</small>}<small className="text-stone-500">{review.userName}</small></article>)}</section>
      {relatedArticles.length > 0 && <section className="max-w-5xl mx-auto w-full mt-12 border-t border-stone-800 pt-8"><h2 className="font-serif text-xl text-[#C4A77D]">Vous aimerez aussi</h2><div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">{relatedArticles.map(item => <Link key={item.id} href={`/boutique/${item.id}`} className="border border-stone-800 p-2"><img src={item.imageUrl || "/logo.png"} alt={item.title} loading="lazy" className="aspect-square w-full object-cover" /><p className="mt-2 text-xs text-[#C4A77D]">{item.title}</p></Link>)}</div></section>}
      {zoomOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-6" onClick={() => setZoomOpen(false)}><img src={activeImage} alt={article.title} className="max-h-[90vh] max-w-[90vw] object-contain" /></div>}
    </main>
  );
}

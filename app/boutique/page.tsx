"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Sun, Moon, ShoppingBag, Check } from "lucide-react";
import { useThemeStore } from "@/store/useThemeStore";
import { useCartStore } from "@/store/useCartStore";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { CatalogTaxonomy, defaultCatalogTaxonomy, TaxonomyKey, taxonomyLabels } from "@/lib/catalogTaxonomy";

export default function BoutiquePage() {
  const { isDayMode, toggleDayMode } = useThemeStore();
  const addToCart = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  
  const safeItems = Array.isArray(cartItems) ? cartItems : [];
  const totalItems = safeItems.reduce((sum, item) => sum + item.quantity, 0);

  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [selectedTheme, setSelectedTheme] = useState("all");
  const [selectedColor, setSelectedColor] = useState("all");
  const [catalogTaxonomy, setCatalogTaxonomy] = useState<CatalogTaxonomy>(defaultCatalogTaxonomy);
  const [notification, setNotification] = useState("");

  // Récupération dynamique depuis Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "articles"), (snapshot) => {
      const fetchedProducts = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.title || "Bijou LYJY",
          category: data.category || "colliers",
          subcategory: data.subcategory || "",
          theme: data.theme || "",
          color: data.color || "",
          price: data.finalPrice || data.price || 0,
          originalPrice: data.price || 0,
          reduction: data.reduction || 0,
          isCustomGiftCard: data.isCustomGiftCard === true,
          giftCardConfig: data.giftCardConfig || null,
          image: data.imageUrl || "/logo.png",
          imageUrls: data.imageUrls || [data.imageUrl || "/logo.png"],
          isAvailable: data.isAvailable !== false,
        };
      });
      
      setProducts(fetchedProducts.filter((p) => p.isAvailable));
    });

    const unsubscribeTaxonomy = onSnapshot(doc(db, "settings", "catalogTaxonomy"), snapshot => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      setCatalogTaxonomy({
        categories: data.categories || [],
        subcategories: data.subcategories || [],
        themes: data.themes || [],
        colors: data.colors || [],
      });
    });
 
    return () => {
      unsubscribe();
      unsubscribeTaxonomy();
    };
  }, []);

  const filteredProducts = products.filter(product =>
    (selectedCategory === "all" || product.category === selectedCategory) &&
    (selectedSubcategory === "all" || product.subcategory === selectedSubcategory) &&
    (selectedTheme === "all" || product.theme === selectedTheme) &&
    (selectedColor === "all" || product.color === selectedColor)
  );
  const filterGroups: Array<{ key: TaxonomyKey; value: string; setter: (value: string) => void }> = [
    { key: "categories", value: selectedCategory, setter: setSelectedCategory },
    { key: "subcategories", value: selectedSubcategory, setter: setSelectedSubcategory },
    { key: "themes", value: selectedTheme, setter: setSelectedTheme },
    { key: "colors", value: selectedColor, setter: setSelectedColor },
  ];

  const handleAddToCart = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
    });
    setNotification(`${product.name} a été ajouté au panier.`);
    setTimeout(() => setNotification(""), 3000);
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
        
        <h1 className="text-lg font-serif tracking-[0.2em] text-[#C4A77D]">Boutique LYJY</h1>

        <div className="flex items-center gap-6">
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

          <Link href="/panier" className={`flex items-center gap-2 text-xs tracking-widest uppercase transition-colors ${
            isDayMode ? "text-stone-600 hover:text-[#C4A77D]" : "text-stone-400 hover:text-[#C4A77D]"
          }`}>
            <ShoppingBag className="w-4 h-4" /> Panier ({totalItems})
          </Link>
        </div>
      </header>

      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#C4A77D] text-black text-xs px-4 py-3 shadow-lg flex items-center gap-2 tracking-wider uppercase font-light">
          <Check className="w-4 h-4" /> {notification}
        </div>
      )}

      <div className="max-w-6xl mx-auto w-full space-y-10">
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border p-4 ${isDayMode ? "border-stone-200 bg-stone-100" : "border-stone-900 bg-stone-950"}`}>
          {filterGroups.map(group => (
            <label key={group.key} className="text-[10px] uppercase tracking-widest text-stone-500">
              {taxonomyLabels[group.key]}
              <select value={group.value} onChange={(event) => group.setter(event.target.value)} className={`mt-2 w-full border p-2 text-xs ${isDayMode ? "border-stone-300 bg-white text-stone-900" : "border-stone-800 bg-black text-stone-200"}`}>
                <option value="all">Tous</option>
                {catalogTaxonomy[group.key].filter(item => item.isVisible).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
          ))}
        </div>
        <div className="text-center py-8 border-y border-[#C4A77D]/40"><p className="font-serif text-2xl md:text-4xl tracking-[0.35em] text-[#C4A77D] drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">OUVERTURE PROCHAINEMENT</p></div>

        {filteredProducts.length === 0 ? (
          <p className="text-center text-xs tracking-widest text-stone-500 uppercase py-12">
            Aucun article disponible pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <Link 
                key={product.id} 
                href={`/boutique/${product.id}`}
                className={`p-6 border flex flex-col justify-between transition-all duration-300 group ${
                  isDayMode ? "bg-stone-100 border-stone-200 hover:border-[#C4A77D]" : "bg-stone-950 border-stone-900 hover:border-[#C4A77D]"
                }`}
              >
                <div>
                  <div className="relative w-full h-48 mb-4 flex items-center justify-center bg-stone-900/10 overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={180}
                      height={180}
                      className="object-cover h-full w-full group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.imageUrls && product.imageUrls.length > 1 && (
                      <span className="absolute top-2 right-2 bg-black/70 text-[#C4A77D] text-[10px] px-2 py-0.5 uppercase tracking-widest border border-[#C4A77D]/30">
                        +{product.imageUrls.length - 1} photos
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-6">
                    <h3 className="font-serif text-sm tracking-wider text-[#C4A77D]">{product.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-light">
                        {product.isCustomGiftCard
                          ? `De ${(Number(product.giftCardConfig?.minAmount) || product.price).toFixed(2)} € à ${(Number(product.giftCardConfig?.maxAmount) || product.price).toFixed(2)} €`
                          : `${product.price.toFixed(2)} €`}
                      </p>
                      {product.reduction > 0 && (
                        <span className="line-through text-xs text-stone-500">{product.originalPrice.toFixed(2)} €</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => handleAddToCart(product, e)}
                  className="w-full border border-[#C4A77D] text-[#C4A77D] py-3 text-xs tracking-[0.2em] uppercase hover:bg-[#C4A77D] hover:text-black transition-all duration-300 font-light"
                >
                  Ajouter au panier
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

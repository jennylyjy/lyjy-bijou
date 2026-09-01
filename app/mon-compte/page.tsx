"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sun,
  Moon,
  User,
  Package,
  MapPin,
  LogOut,
  Check,
  Truck,
  Gift,
} from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";
import { useCartStore } from "@/store/useCartStore";
import { db } from "../../lib/firebase";
import { auth } from "../../lib/firebase";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import VirtualAdventCalendar from "@/components/VirtualAdventCalendar";

const orderTimestamp = (order: any) => {
  const value = order.createdAt;
  if (value?.toDate) return value.toDate().getTime();
  const parsed = new Date(value || order.date || 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatOrderDate = (order: any) => {
  const time = orderTimestamp(order);
  return time ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(time)) : order.date || "Date inconnue";
};

export default function AccountPage() {
  const { isDayMode, toggleDayMode } = useThemeStore();

  const resetCart = useCartStore((state) => state.resetCart);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  const [street, setStreet] = useState("");
  const [complement, setComplement] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  const [queryInput, setQueryInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    const userJson = localStorage.getItem("lyjy_current_user");

    if (!userJson) {
      router.push("/connexion");
      return;
    }

    const user = JSON.parse(userJson);
    setCurrentUser(user);

    if (user.addressDetails) {
      setStreet(user.addressDetails.street || "");
      setComplement(user.addressDetails.complement || "");
      setPostalCode(user.addressDetails.postalCode || "");
      setCity(user.addressDetails.city || "");
    }

    // Récupération des commandes en temps réel depuis Firestore pour cet utilisateur
    if (user.email) {
      const q = query(
        collection(db, "orders"),
        where("clientEmail", "==", user.email)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedOrders = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setUserOrders(fetchedOrders.sort((a, b) => orderTimestamp(b) - orderTimestamp(a)));
        },
        (error) => {
          console.error("Erreur récupération commandes Firestore :", error);
        }
      );

      return () => unsubscribe();
    }
  }, [router]);

  useEffect(() => {
    if (queryInput.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
            queryInput
          )}&limit=5`
        );
        const data = await res.json();
        setSuggestions(data.features || []);
      } catch (err) {
        console.error("Erreur lors de la récupération des adresses", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [queryInput]);

  const handleSelectAddress = (feature: any) => {
    const props = feature.properties;
    setStreet(props.name || "");
    setPostalCode(props.postcode || "");
    setCity(props.city || "");
    setQueryInput("");
    setSuggestions([]);
  };

  const handleLogout = () => {
    resetCart();
    localStorage.removeItem("lyjy_current_user");
    router.push("/");
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || deleteConfirmation !== "SUPPRIMER" || deleteEmail.trim().toLowerCase() !== String(currentUser.email).toLowerCase()) return;
    if (!window.confirm("Cette action est définitive. Confirmer la suppression du compte ?")) return;
    setIsDeletingAccount(true);
    try {
      if (currentUser.uid) await deleteDoc(doc(db, "users", currentUser.uid));
      if (auth.currentUser) await deleteUser(auth.currentUser);
      await fetch("/api/account-deleted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email }),
      }).catch(() => undefined);
      resetCart();
      localStorage.removeItem("lyjy_current_user");
      router.push("/");
    } catch {
      setSuccessMessage("Reconnectez-vous avant de supprimer votre compte, puis réessayez.");
      setTimeout(() => setSuccessMessage(""), 4000);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const addressDetails = {
      street,
      complement,
      postalCode,
      city,
    };

    const updatedUser = {
      ...currentUser,
      addressDetails,
    };

    setCurrentUser(updatedUser);
    localStorage.setItem("lyjy_current_user", JSON.stringify(updatedUser));

    const users = JSON.parse(localStorage.getItem("lyjy_users") || "[]");
    const updatedUsers = users.map((u: any) =>
      u.email === updatedUser.email ? updatedUser : u
    );

    localStorage.setItem("lyjy_users", JSON.stringify(updatedUsers));
    setSuccessMessage("Adresse enregistrée avec succès !");

    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "preparing":
        return "En cours de préparation";
      case "ready":
        return "Prête";
      case "shipping":
        return "En cours d'expédition";
      case "sent":
        return "Expédiée";
      case "cancelled":
        return "Annulée";
      default:
        return status;
    }
  };

  if (!currentUser) return null;

  return (
    <main
      className={`min-h-screen flex flex-col font-sans px-6 py-6 md:px-16 transition-colors duration-500 ${
        isDayMode ? "bg-[#F9F8F6] text-stone-900" : "bg-black text-stone-200"
      }`}
    >
      <header
        className={`flex items-center justify-between border-b pb-6 mb-10 transition-colors duration-500 ${
          isDayMode ? "border-stone-200" : "border-stone-900"
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
          <ArrowLeft className="w-4 h-4" /> Accueil
        </Link>

        <h1 className="text-lg font-serif tracking-[0.2em] text-[#C4A77D]">
          Mon Compte
        </h1>

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

      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-8">
        <div
          className={`p-6 border h-fit space-y-4 ${
            isDayMode
              ? "bg-stone-100 border-stone-200"
              : "bg-stone-950 border-stone-900"
          }`}
        >
          <h3 className="font-serif text-sm tracking-widest text-[#C4A77D] uppercase pb-2 border-b border-stone-900">
            Tableau de bord
          </h3>

          <ul className="space-y-3 text-xs tracking-wider">
            <li>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full text-left transition-colors flex items-center gap-2 ${
                  activeTab === "dashboard"
                    ? "text-[#C4A77D]"
                    : "hover:text-[#C4A77D]"
                }`}
              >
                <User className="w-4 h-4" /> Vue d&apos;ensemble
              </button>
            </li>

            <li>
              <button
                onClick={() => setActiveTab("orders")}
                className={`w-full text-left transition-colors flex items-center gap-2 ${
                  activeTab === "orders"
                    ? "text-[#C4A77D]"
                    : "hover:text-[#C4A77D]"
                }`}
              >
                <Package className="w-4 h-4" /> Mes commandes (
                {userOrders.length})
              </button>
            </li>

            <li>
              <button
                onClick={() => setActiveTab("virtual-advent")}
                className={`w-full text-left transition-colors flex items-center gap-2 ${
                  activeTab === "virtual-advent"
                    ? "text-[#C4A77D]"
                    : "hover:text-[#C4A77D]"
                }`}
              >
                <Gift className="w-4 h-4" /> Mon calendrier virtuel
              </button>
            </li>

            <li>
              <button
                onClick={() => setActiveTab("addresses")}
                className={`w-full text-left transition-colors flex items-center gap-2 ${
                  activeTab === "addresses"
                    ? "text-[#C4A77D]"
                    : "hover:text-[#C4A77D]"
                }`}
              >
                <MapPin className="w-4 h-4" /> Mes adresses
              </button>
            </li>

            <li>
              <button
                onClick={() => setActiveTab("details")}
                className={`w-full text-left transition-colors flex items-center gap-2 ${
                  activeTab === "details"
                    ? "text-[#C4A77D]"
                    : "hover:text-[#C4A77D]"
                }`}
              >
                <User className="w-4 h-4" /> Détails du compte
              </button>
            </li>

            <li className="pt-4 border-t border-stone-900">
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 w-full text-left"
              >
                <LogOut className="w-4 h-4" /> Déconnexion
              </button>
            </li>
          </ul>
        </div>

        <div
          className={`md:col-span-2 p-8 border space-y-6 ${
            isDayMode
              ? "bg-stone-100 border-stone-200"
              : "bg-stone-950 border-stone-900"
          }`}
        >
          {activeTab === "dashboard" && (
            <>
              <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D]">
                Bienvenue, {currentUser.firstName} {currentUser.lastName}
              </h2>

              <p className="text-xs text-stone-500 tracking-wider">
                Depuis votre tableau de bord, vous pouvez consulter vos
                commandes récentes, gérer vos adresses de livraison et modifier
                vos informations personnelles.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div
                  onClick={() => setActiveTab("orders")}
                  className={`p-4 border cursor-pointer hover:border-[#C4A77D] transition-colors ${
                    isDayMode
                      ? "border-stone-200 bg-white"
                      : "border-stone-900 bg-black"
                  }`}
                >
                  <h4 className="text-xs uppercase tracking-widest text-[#C4A77D] mb-1">
                    Commandes
                  </h4>

                  <p className="text-2xl font-serif">{userOrders.length}</p>
                </div>

                <div
                  onClick={() => setActiveTab("addresses")}
                  className={`p-4 border cursor-pointer hover:border-[#C4A77D] transition-colors ${
                    isDayMode
                      ? "border-stone-200 bg-white"
                      : "border-stone-900 bg-black"
                  }`}
                >
                  <h4 className="text-xs uppercase tracking-widest text-[#C4A77D] mb-1">
                    Adresses enregistrées
                  </h4>

                  <p className="text-2xl font-serif">
                    {currentUser.addressDetails ? "1" : "0"}
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === "orders" && (
            <div className="space-y-4">
              <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D]">
                Mes Commandes
              </h2>

              {userOrders.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-xs text-stone-500 tracking-wider">
                    Vous n&apos;avez passé aucune commande pour le moment.
                  </p>

                  <div className="pt-4">
                    <Link
                      href="/boutique"
                      className="border border-[#C4A77D] text-[#C4A77D] px-6 py-3 text-xs tracking-[0.3em] uppercase hover:bg-[#C4A77D] hover:text-black transition-all"
                    >
                      Découvrir la collection
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {userOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`p-4 border space-y-3 ${
                        isDayMode
                          ? "border-stone-200 bg-white"
                          : "border-stone-900 bg-black"
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs tracking-wider border-b pb-2 border-stone-800">
                        <span className="font-serif text-sm text-[#C4A77D]">
                          {order.id}
                        </span>

                        <span className="text-stone-400">{formatOrderDate(order)}</span>
                      </div>

                      <div className="text-xs tracking-wider space-y-2">
                        <p>
                          <strong>Statut : </strong>{" "}
                          <span className="text-[#C4A77D]">
                            {getStatusLabel(order.status)}
                          </span>
                        </p>

                        {order.trackingNumber && (
                          <div className="p-2 bg-green-500/10 border border-green-500/20 text-green-400 flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            <span>
                              N° de Suivi Colissimo :{" "}
                              <strong>{order.trackingNumber}</strong>
                            </span>
                          </div>
                        )}

                        <p>
                          <strong>Total : </strong>{" "}
                          {typeof order.total === "number"
                            ? `${order.total.toFixed(2)} €`
                            : order.total}
                        </p>

                        <div className="pt-2">
                          <span className="text-stone-500 block mb-1">
                            Articles :
                          </span>

                          <ul className="list-disc list-inside text-stone-400 space-y-1">
                            {(order.items || []).map(
                              (item: any, i: number) => (
                                <li key={i}>
                                  {item.name || item.title} (x
                                  {item.quantity}) -{" "}
                                  {(item.price * item.quantity).toFixed(2)} €
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "virtual-advent" && (
            <VirtualAdventCalendar userEmail={currentUser.email} isDayMode={isDayMode} />
          )}

          {activeTab === "addresses" && (
            <div className="space-y-6">
              <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D]">
                Adresse de Livraison
              </h2>

              {successMessage && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs p-3 flex items-center gap-2">
                  <Check className="w-4 h-4" /> {successMessage}
                </div>
              )}

              <div className="space-y-2 relative">
                <label className="block text-xs tracking-widest uppercase text-stone-500">
                  Recherche automatique (API Adresse)
                </label>

                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Tapez votre adresse pour l'auto-compléter..."
                  className={`w-full p-3 text-sm border focus:outline-none focus:border-[#C4A77D] transition-colors ${
                    isDayMode
                      ? "bg-white border-stone-300 text-stone-900"
                      : "bg-black border-stone-800 text-stone-100"
                  }`}
                />

                {suggestions.length > 0 && (
                  <ul
                    className={`absolute z-10 w-full border shadow-lg max-h-48 overflow-y-auto ${
                      isDayMode
                        ? "bg-white border-stone-300 text-stone-900"
                        : "bg-stone-900 border-stone-800 text-stone-200"
                    }`}
                  >
                    {suggestions.map((item, index) => (
                      <li
                        key={index}
                        onClick={() => handleSelectAddress(item)}
                        className="p-3 text-xs cursor-pointer hover:bg-[#C4A77D] hover:text-black transition-colors border-b border-stone-800/50 last:border-none"
                      >
                        {item.properties.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form onSubmit={handleSaveAddress} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="block text-xs tracking-widest uppercase text-stone-500">
                    Numéro et nom de voie
                  </label>

                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="30 rue de la Paix"
                    className={`w-full p-3 text-sm border focus:outline-none focus:border-[#C4A77D] transition-colors ${
                      isDayMode
                        ? "bg-white border-stone-300 text-stone-900"
                        : "bg-black border-stone-800 text-stone-100"
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs tracking-widest uppercase text-stone-500">
                    Complément d&apos;adresse (Appartement, bâtiment...)
                  </label>

                  <input
                    type="text"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Bâtiment B, 2ème étage"
                    className={`w-full p-3 text-sm border focus:outline-none focus:border-[#C4A77D] transition-colors ${
                      isDayMode
                        ? "bg-white border-stone-300 text-stone-900"
                        : "bg-black border-stone-800 text-stone-100"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs tracking-widest uppercase text-stone-500">
                      Code postal
                    </label>

                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="75001"
                      className={`w-full p-3 text-sm border focus:outline-none focus:border-[#C4A77D] transition-colors ${
                        isDayMode
                          ? "bg-white border-stone-300 text-stone-900"
                          : "bg-black border-stone-800 text-stone-100"
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs tracking-widest uppercase text-stone-500">
                      Ville
                    </label>

                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Paris"
                      className={`w-full p-3 text-sm border focus:outline-none focus:border-[#C4A77D] transition-colors ${
                        isDayMode
                          ? "bg-white border-stone-300 text-stone-900"
                          : "bg-black border-stone-800 text-stone-100"
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-[#C4A77D] text-black px-6 py-3 text-xs tracking-[0.3em] uppercase hover:bg-[#b3956c] transition-colors font-light mt-2"
                >
                  Enregistrer l&apos;adresse
                </button>
              </form>
            </div>
          )}

          {activeTab === "details" && (
            <div className="space-y-6">
              <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D]">
                Détails du Compte
              </h2>

              <div className="space-y-4 text-xs tracking-wider">
                <div
                  className={`p-4 border ${
                    isDayMode
                      ? "border-stone-200 bg-white"
                      : "border-stone-900 bg-black"
                  }`}
                >
                  <span className="text-stone-500 uppercase block mb-1">
                    Prénom & Nom
                  </span>

                  <p className="text-sm font-serif">
                    {currentUser.firstName} {currentUser.lastName}
                  </p>
                </div>

                <div
                  className={`p-4 border ${
                    isDayMode
                      ? "border-stone-200 bg-white"
                      : "border-stone-900 bg-black"
                  }`}
                >
                  <span className="text-stone-500 uppercase block mb-1">
                    Adresse e-mail
                  </span>

                  <p className="text-sm font-serif">{currentUser.email}</p>
                </div>

                <div
                  className={`p-4 border ${
                    isDayMode
                      ? "border-stone-200 bg-white"
                      : "border-stone-900 bg-black"
                  }`}
                >
                  <span className="text-stone-500 uppercase block mb-1">
                    Adresse de livraison
                  </span>

                  {currentUser.addressDetails &&
                  currentUser.addressDetails.street ? (
                    <div className="text-sm font-serif">
                      <p>{currentUser.addressDetails.street}</p>

                      {currentUser.addressDetails.complement && (
                        <p>{currentUser.addressDetails.complement}</p>
                      )}

                      <p>
                        {currentUser.addressDetails.postalCode}{" "}
                        {currentUser.addressDetails.city}
                      </p>
                    </div>
                  ) : (
                    <p className="text-stone-500 italic">
                      Aucune adresse enregistrée.
                    </p>
                  )}
                </div>
              </div>

              <form onSubmit={handleDeleteAccount} className="mt-8 border border-red-500/30 p-4 space-y-3">
                <h3 className="text-sm uppercase tracking-widest text-red-400">Supprimer mon compte</h3>
                <p className="text-xs text-stone-500">Cette action est définitive. Écrivez SUPPRIMER et confirmez votre adresse e-mail.</p>
                <input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="SUPPRIMER" className="w-full border border-stone-800 bg-black p-3 text-sm" required />
                <input type="email" value={deleteEmail} onChange={(e) => setDeleteEmail(e.target.value)} placeholder="Votre adresse e-mail" className="w-full border border-stone-800 bg-black p-3 text-sm" required />
                <button type="submit" disabled={isDeletingAccount || deleteConfirmation !== "SUPPRIMER" || deleteEmail.trim().toLowerCase() !== String(currentUser.email).toLowerCase()} className="border border-red-500 px-4 py-2 text-xs uppercase tracking-widest text-red-400 disabled:opacity-40">
                  {isDeletingAccount ? "Suppression..." : "Supprimer définitivement"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Sun, Moon, Shield, Trash2, Check, Package, Clock, 
  Send, CheckCircle2, FileText, X, Plus, Eye, EyeOff, Edit, Lock, LogOut, Truck,
  Tag, TrendingUp, AlertTriangle, Euro, Calendar, Users, Wand2, Gift, Sparkles, Settings
} from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";
import { db, storage, auth } from "../../lib/firebase";
import { 
  collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocs, where, setDoc, getDoc, writeBatch 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from "firebase/auth";
import CatalogTaxonomyManager from "@/components/CatalogTaxonomyManager";
import { CatalogTaxonomy, defaultCatalogTaxonomy } from "@/lib/catalogTaxonomy";
import { isAllowedAdminEmail } from "@/lib/adminAuthorization";
import AdminLoginPanel from "@/components/admin/AdminLoginPanel";
import AdminTutorial from "@/components/admin/AdminTutorial";

function AdminPage() {
  const { isDayMode, toggleDayMode } = useThemeStore();

  // AUTHENTIFICATION
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminAllowed, setAdminAllowed] = useState(true);
  const [statsSince, setStatsSince] = useState(0);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // NAV ET DONNÉES
  const [activeTab, setActiveTab] = useState("orders");
  const [orderSubTab, setOrderSubTab] = useState("preparing");
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);

  // MODALE D'EXPÉDITION
  const [shippingOrder, setShippingOrder] = useState<any | null>(null);
  const [carrier, setCarrier] = useState("Colissimo");
  const [trackingNumber, setTrackingNumber] = useState("");

  // CODES PROMO (ENRICHI)
  const [promoCode, setPromoCode] = useState("");
  const [promoType, setPromoType] = useState("percent");
  const [promoValue, setPromoValue] = useState("");
  const [promoMaxUses, setPromoMaxUses] = useState("");
  const [promoExpiration, setPromoExpiration] = useState("");

  // CARTES CADEAUX
  const [gcCode, setGcCode] = useState("");
  const [gcAmount, setGcAmount] = useState("");
  const [customGiftCardTitle, setCustomGiftCardTitle] = useState("Carte Cadeau LYJY Sur-Mesure");
  const [customGiftCardDescription, setCustomGiftCardDescription] = useState("Offrez le montant de votre choix accompagné d'un message personnalisé.");
  const [customGiftCardMinAmount, setCustomGiftCardMinAmount] = useState("10");
  const [customGiftCardMaxAmount, setCustomGiftCardMaxAmount] = useState("500");
  const [isSubmittingCustomGiftCard, setIsSubmittingCustomGiftCard] = useState(false);

  // CRÉATION & ÉDITION D'ARTICLE (MULTIPLE PHOTOS)
  const [articleTitle, setArticleTitle] = useState("");
  const [articleDescription, setArticleDescription] = useState("");
  const [articlePrice, setArticlePrice] = useState("");
  const [articleReduction, setArticleReduction] = useState("0");
  const [articleQuantity, setArticleQuantity] = useState("");
  const [articleWeight, setArticleWeight] = useState("");
  const [articleCategory, setArticleCategory] = useState("");
  const [articleSubcategory, setArticleSubcategory] = useState("");
  const [articleTheme, setArticleTheme] = useState("");
  const [articleColor, setArticleColor] = useState("");
  const [catalogTaxonomy, setCatalogTaxonomy] = useState<CatalogTaxonomy>(defaultCatalogTaxonomy);
  const [articleImageFiles, setArticleImageFiles] = useState<FileList | null>(null);
  const [articleFilterCategory, setArticleFilterCategory] = useState("all");
  const [articleSearchRef, setArticleSearchRef] = useState("");
  const [isSubmittingArticle, setIsSubmittingArticle] = useState(false);

  const [editingArticle, setEditingArticle] = useState<any | null>(null);
  const [editImageFiles, setEditImageFiles] = useState<FileList | null>(null);

  // CALENDRIER DE L'AVENT
  const [adventTitle, setAdventTitle] = useState("Calendrier de l'Avent Sur-Mesure");
  const [adventPrice, setAdventPrice] = useState("49.90");
  const [adventStock, setAdventStock] = useState("10");
  const [adventBoxCount, setAdventBoxCount] = useState<number>(24);
  const [adventFinish, setAdventFinish] = useState<string>("mixte");
  const [adventCategories, setAdventCategories] = useState<string[]>(["colliers", "bagues", "boucles", "bracelets"]);
  const [adventDescription, setAdventDescription] = useState("");
  const [adventImageFiles, setAdventImageFiles] = useState<FileList | null>(null);
  const [isSubmittingAdvent, setIsSubmittingAdvent] = useState(false);

  // NOUVEAU : SYSTÈME D'OPTIONS ACTIVABLES PAR CASES À COCHER POUR LE CALENDRIER
  const [adventOptions, setAdventOptions] = useState([
    { id: "giftWrap", label: "Emballage cadeau de luxe inclus", enabled: true },
    { id: "cert", label: "Certificat d'authenticité personnalisé", enabled: true },
    { id: "pouch", label: "Pochette en velours signée", enabled: false },
    { id: "express", label: "Option livraison prioritaire offerte", enabled: false }
  ]);

  // CONFIGURATION GLOBALE CALENDRIER DE L'AVENT (FIRESTORE SETTINGS)
  const [adventEnabled, setAdventEnabled] = useState(false);
  const [adventBasePrice, setAdventBasePrice] = useState("49.90");
  const [adventNoticeMessage, setAdventNoticeMessage] = useState("");
  const [isSavingAdventConfig, setIsSavingAdventConfig] = useState(false);

  // CALENDRIER DE L'AVENT VIRTUEL AVEC BONS DE RÉDUCTION
  const [virtualAdventTitle, setVirtualAdventTitle] = useState("Calendrier de l'Avent Virtuel");
  const [virtualAdventStartDate, setVirtualAdventStartDate] = useState("2026-12-01");
  const [virtualAdventEndDate, setVirtualAdventEndDate] = useState("2026-12-24");
  const [isSubmittingVirtualAdvent, setIsSubmittingVirtualAdvent] = useState(false);
  const [virtualAdventCalendars, setVirtualAdventCalendars] = useState<any[]>([]);
  const [virtualAdventRewards, setVirtualAdventRewards] = useState(
    Array.from({ length: 24 }, (_, index) => ({
      day: index + 1,
      enabled: true,
      discountType: "percent",
      discountValue: "10",
      minimumAmount: "0",
      code: "",
    }))
  );

  // Fonction pour basculer l'état d'une option du calendrier
  const handleToggleAdventOption = (id: string) => {
    setAdventOptions(prev => 
      prev.map(opt => opt.id === id ? { ...opt, enabled: !opt.enabled } : opt)
    );
  };

  // Fonction utilitaire pour générer un code aléatoire
  const generateRandomCode = (prefix: string) => {
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${randomString}`;
  };

  const handleUpdateVirtualReward = (
    day: number,
    field: "enabled" | "discountType" | "discountValue" | "minimumAmount" | "code",
    value: boolean | string
  ) => {
    setVirtualAdventRewards(rewards => rewards.map(reward =>
      reward.day === day ? { ...reward, [field]: value } : reward
    ));
  };

  // Suivi Auth Firebase
  useEffect(() => {
    setStatsSince(Number(localStorage.getItem("lyjy_stats_since") || 0));
  }, []);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAdminAllowed(isAllowedAdminEmail(user?.email));
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ÉCOUTE EN TEMPS RÉEL FIRESTORE
  useEffect(() => {
    if (!currentUser || !adminAllowed) return;

    const unsubArticles = onSnapshot(collection(db, "articles"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArticles(list);
    });

    const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
    }, (error) => {
      onSnapshot(collection(db, "orders"), (snap) => {
        setOrders(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
      });
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snapshot) => {
      setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubGiftCards = onSnapshot(collection(db, "giftCards"), (snapshot) => {
      setGiftCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubVirtualAdvents = onSnapshot(collection(db, "virtualAdventCalendars"), (snapshot) => {
      setVirtualAdventCalendars(snapshot.docs.map(calendarDoc => ({ id: calendarDoc.id, ...calendarDoc.data() })));
    });

    const unsubCatalogTaxonomy = onSnapshot(doc(db, "settings", "catalogTaxonomy"), snapshot => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      setCatalogTaxonomy({
        categories: data.categories || [],
        subcategories: data.subcategories || [],
        themes: data.themes || [],
        colors: data.colors || [],
      });
    });

    // Chargement de la configuration globale de l'Avent depuis Firestore
    const fetchAdventConfig = async () => {
      try {
        const configDocRef = doc(db, "settings", "advent");
        const configSnap = await getDoc(configDocRef);
        if (configSnap.exists()) {
          const data = configSnap.data();
          setAdventEnabled(!!data.enabled);
          if (data.basePrice !== undefined) setAdventBasePrice(String(data.basePrice));
          if (data.noticeMessage !== undefined) setAdventNoticeMessage(data.noticeMessage);
        }
      } catch (err) {
        console.error("Erreur chargement configuration Avent :", err);
      }
    };
    fetchAdventConfig();

    return () => {
      unsubArticles();
      unsubOrders();
      unsubUsers();
      unsubCoupons();
      unsubGiftCards();
      unsubVirtualAdvents();
      unsubCatalogTaxonomy();
    };
  }, [currentUser, adminAllowed]);

  const handleDeleteVirtualAdvent = async (id: string) => {
    if (!window.confirm("Supprimer ce calendrier virtuel ? Il ne sera plus visible par les clients.")) return;
    try {
      await deleteDoc(doc(db, "virtualAdventCalendars", id));
      setSuccessMessage("Calendrier virtuel supprimé.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch {
      alert("Impossible de supprimer le calendrier virtuel.");
    }
  };

  const totalRevenue = orders
    .filter(o => o.status !== "cancelled" && (!statsSince || new Date(o.createdAt || o.date || 0).getTime() >= statsSince))
    .reduce((sum, o) => sum + (typeof o.total === "number" ? o.total : parseFloat(o.total) || 0), 0);

  const lowStockArticles = articles.filter(a => (parseInt(a.quantity) || 0) <= 2);
  const adventArticles = articles.filter(a => a.isAdvent || a.category === "calendrier-avent");
  const adventCategoryAvailability = catalogTaxonomy.categories
    .filter(item => item.isVisible && item.id !== "calendrier-avent")
    .map(item => item.id)
    .map(category => {
      const availableStock = articles
        .filter(article =>
          !article.isAdvent &&
          article.category?.toLowerCase() === category.toLowerCase() &&
          article.isAvailable !== false
        )
        .reduce((total, article) => total + Math.max(0, parseInt(article.quantity) || 0), 0);

      return { category, availableStock, isAvailable: availableStock > 0 };
    });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err: any) {
      setLoginError("Identifiants incorrects. Vérifiez l'e-mail et le mot de passe.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("Supprimer cet utilisateur de la base ?")) {
      try {
        await deleteDoc(doc(db, "users", id));
        setSuccessMessage("Utilisateur supprimé.");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        alert("Erreur suppression utilisateur.");
      }
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode || !promoValue) return;

    try {
      await addDoc(collection(db, "coupons"), {
        code: promoCode.toUpperCase().trim(),
        discountType: promoType,
        discountValue: parseFloat(promoValue) || 0,
        maxUses: promoMaxUses ? parseInt(promoMaxUses) : null,
        currentUses: 0,
        usedBy: [],
        expirationDate: promoExpiration ? new Date(promoExpiration).toISOString() : null,
        isActive: true,
        createdAt: new Date().toISOString()
      });

      setSuccessMessage("Code promo configuré avec succès !");
      setPromoCode("");
      setPromoValue("");
      setPromoMaxUses("");
      setPromoExpiration("");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      alert("Erreur création code promo : " + err.message);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (confirm("Supprimer ce code promo ?")) {
      try {
        await deleteDoc(doc(db, "coupons", id));
        setSuccessMessage("Code promo supprimé.");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        alert("Erreur suppression du code promo.");
      }
    }
  };

  const handleAddGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gcCode || !gcAmount) return;

    try {
      const amount = parseFloat(gcAmount) || 0;
      await addDoc(collection(db, "giftCards"), {
        code: gcCode.toUpperCase().trim(),
        initialAmount: amount,
        remainingBalance: amount,
        isActive: true,
        createdAt: new Date().toISOString()
      });

      setSuccessMessage("Carte cadeau créée avec succès !");
      setGcCode("");
      setGcAmount("");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      alert("Erreur création carte cadeau : " + err.message);
    }
  };

  const handleDeleteGiftCard = async (giftCard: any) => {
    if (!giftCard?.id) return;
    if (!confirm(`Supprimer définitivement la carte cadeau ${giftCard.code} ?`)) return;

    try {
      await deleteDoc(doc(db, "giftCards", giftCard.id));
      setSuccessMessage(`Carte cadeau ${giftCard.code} supprimée.`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      alert("Impossible de supprimer cette carte cadeau : " + error.message);
    }
  };

  // Sauvegarde de la configuration globale de l'Avent
  const handleSaveAdventGlobalConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAdventConfig(true);
    try {
      await setDoc(doc(db, "settings", "advent"), {
        enabled: adventEnabled,
        basePrice: parseFloat(adventBasePrice) || 49.90,
        noticeMessage: adventNoticeMessage,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSuccessMessage("Configuration globale du Calendrier de l'Avent enregistrée !");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      alert("Erreur lors de la sauvegarde : " + error.message);
    } finally {
      setIsSavingAdventConfig(false);
    }
  };

  const handleCreateCustomGiftCardProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const minAmount = parseFloat(customGiftCardMinAmount) || 0;
    const maxAmount = parseFloat(customGiftCardMaxAmount) || 0;
    if (!customGiftCardTitle.trim() || minAmount <= 0 || maxAmount < minAmount) {
      alert("Vérifiez le titre et les montants minimum et maximum.");
      return;
    }

    setIsSubmittingCustomGiftCard(true);
    try {
      await addDoc(collection(db, "articles"), {
        ref: `LYJY-GIFT-${Math.floor(100000 + Math.random() * 900000)}`,
        title: customGiftCardTitle.trim(),
        description: customGiftCardDescription.trim(),
        price: minAmount,
        reduction: 0,
        finalPrice: minAmount,
        quantity: 999999,
        category: "cartes-cadeaux",
        isCustomGiftCard: true,
        giftCardConfig: { minAmount, maxAmount },
        imageUrl: "/logo.png",
        imageUrls: ["/logo.png"],
        isAvailable: true,
        createdAt: new Date().toISOString(),
      });
      setSuccessMessage("L'offre de carte cadeau sur-mesure est maintenant disponible dans la boutique !");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      alert("Erreur création de l'offre : " + message);
    } finally {
      setIsSubmittingCustomGiftCard(false);
    }
  };

  const handleCreateVirtualAdvent = async (e: React.FormEvent) => {
    e.preventDefault();

    const enabledRewards = virtualAdventRewards.filter(reward => reward.enabled);
    if (!virtualAdventTitle.trim() || !virtualAdventStartDate || !virtualAdventEndDate) {
      alert("Renseignez le titre et les dates du calendrier virtuel.");
      return;
    }
    if (new Date(virtualAdventEndDate) < new Date(virtualAdventStartDate)) {
      alert("La date de fin doit être postérieure à la date de début.");
      return;
    }
    if (enabledRewards.length === 0 || enabledRewards.some(reward => (parseFloat(reward.discountValue) || 0) <= 0)) {
      alert("Activez au moins une case et indiquez une réduction supérieure à zéro.");
      return;
    }
    if (enabledRewards.some(reward => (parseFloat(reward.minimumAmount) || 0) < 0)) {
      alert("Le montant minimum d'utilisation ne peut pas être négatif.");
      return;
    }
    const customCodes = enabledRewards
      .map(reward => reward.code.trim().toUpperCase())
      .filter(Boolean);
    if (new Set(customCodes).size !== customCodes.length || customCodes.some(code => coupons.some(coupon => coupon.code === code))) {
      alert("Un des codes saisis existe déjà. Modifiez-le ou laissez le champ vide pour générer un code automatique.");
      return;
    }

    setIsSubmittingVirtualAdvent(true);
    try {
      const batch = writeBatch(db);
      const calendarRef = doc(collection(db, "virtualAdventCalendars"));
      const normalizedRewards = enabledRewards.map(reward => ({
        ...reward,
        code: (reward.code.trim() || generateRandomCode(`AVENT${reward.day}`)).toUpperCase(),
        discountValue: parseFloat(reward.discountValue) || 0,
        minimumAmount: parseFloat(reward.minimumAmount) || 0,
      }));

      batch.set(calendarRef, {
        title: virtualAdventTitle.trim(),
        startDate: virtualAdventStartDate,
        endDate: virtualAdventEndDate,
        isActive: true,
        rewards: normalizedRewards,
        createdAt: new Date().toISOString(),
      });

      normalizedRewards.forEach(reward => {
        const couponRef = doc(collection(db, "coupons"));
        batch.set(couponRef, {
          code: reward.code,
          discountType: reward.discountType,
          discountValue: reward.discountValue,
          minimumAmount: reward.minimumAmount,
          maxUses: null,
          currentUses: 0,
          usedBy: [],
          expirationDate: `${virtualAdventEndDate}T23:59:59.999Z`,
          isActive: true,
          source: "virtual-advent",
          virtualAdventId: calendarRef.id,
          adventDay: reward.day,
          createdAt: new Date().toISOString(),
        });
      });

      await batch.commit();
      setVirtualAdventRewards(rewards => rewards.map(reward => ({ ...reward, code: "" })));
      setSuccessMessage(`Calendrier virtuel créé avec ${normalizedRewards.length} bons de réduction !`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      alert("Erreur création du calendrier virtuel : " + message);
    } finally {
      setIsSubmittingVirtualAdvent(false);
    }
  };

  // Annulation et Remboursement automatique sur les Cartes Cadeaux
  const handleCancelAndRefundOrder = async (order: any) => {
    if (!confirm(`Voulez-vous annuler la commande ${order.id} et rembourser sur les cartes cadeaux ?`)) return;

    try {
      if (order.giftCardsUsed && order.giftCardsUsed.length > 0) {
        for (const gcCode of order.giftCardsUsed) {
          const formattedCode = String(gcCode).toUpperCase().trim();
          const q = query(collection(db, "giftCards"), where("code", "==", formattedCode));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const gcDocSnap = snapshot.docs[0];
            const gcData = gcDocSnap.data() as any;
            
            const refundAmount = Number(order.subtotal || order.total) || 0;
            const currentBalance = Number(gcData.remainingBalance) || 0;
            const initialAmount = Number(gcData.initialAmount) || currentBalance;
            const newBalance = Math.min(initialAmount, currentBalance + refundAmount);

            await updateDoc(doc(db, "giftCards", gcDocSnap.id), {
              remainingBalance: newBalance,
              isActive: true
            });
          }
        }
      }

      const orderRef = doc(db, "orders", order.docId);
      await updateDoc(orderRef, { status: "cancelled" });

      setSuccessMessage(`Commande ${order.id} annulée et cartes cadeaux remboursées.`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      alert("Erreur lors de l'annulation : " + err.message);
    }
  };
  const handleDeleteOrder = async (order: any) => {
    if (!confirm(`Supprimer définitivement la commande ${order.id || ""} ?`)) return;
    try { await deleteDoc(doc(db, "orders", order.docId)); setSuccessMessage("Commande supprimée."); setTimeout(() => setSuccessMessage(""), 3000); } catch { alert("Impossible de supprimer la commande."); }
  };

  const handleUpdateOrderStatus = async (docId: string, newStatus: string, trackingInfo?: { carrier: string; trackingNumber: string }) => {
    try {
      const orderRef = doc(db, "orders", docId);
      const updateData: any = { status: newStatus };
      if (trackingInfo) {
        updateData.carrier = trackingInfo.carrier;
        updateData.trackingNumber = trackingInfo.trackingNumber;
      }
      await updateDoc(orderRef, updateData);

      if (newStatus === "sent" && trackingInfo) {
        const order = orders.find(o => o.docId === docId);
        if (order?.clientEmail) {
          fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "SHIPPING_NOTIF",
              email: order.clientEmail,
              orderDetails: { id: order.id, ...trackingInfo }
            })
          }).catch(console.error);
        }
      }

      setSuccessMessage(`Statut de la commande mis à jour : ${newStatus}`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Erreur mise à jour commande :", error);
      alert("Erreur lors de la mise à jour de la commande.");
    }
  };

  const handleConfirmShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingOrder) return;

    await handleUpdateOrderStatus(shippingOrder.docId, "sent", {
      carrier,
      trackingNumber,
    });

    setShippingOrder(null);
    setTrackingNumber("");
    setCarrier("Colissimo");
  };

  const handleGenerateInvoice = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let itemsList = order.items || order.cartItems || [];
    if (itemsList.length === 0 && order.total) {
      itemsList = [{ name: "Commande globale", quantity: 1, price: order.total }];
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Bon de commande - ${order.id}</title>
          <style>
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                margin: 0;
                padding: 20px;
                background-color: #ffffff;
                color: #111111;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              .no-print { display: none; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 40px;
              color: #111;
              background: #fff;
              max-width: 800px;
              margin: 0 auto;
            }
            .brand-header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; border-bottom: 2px solid #C4A77D; padding-bottom: 20px; }
            .brand-header img { width: 60px; height: 60px; object-fit: contain; }
            h1 { color: #C4A77D; font-family: serif; letter-spacing: 2px; margin: 0; font-size: 22px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 13px; line-height: 1.6; }
            .header div { flex: 1; }
            .header div:last-child { text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e5e5e5; padding: 12px; text-align: left; font-size: 12px; vertical-align: top; }
            th { background: #f9f8f6; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; color: #444; }
            .options-list { font-size: 10px; color: #666; margin-top: 4px; text-transform: uppercase; line-height: 1.4; }
            .total { text-align: right; margin-top: 30px; font-size: 16px; font-weight: bold; font-family: serif; color: #C4A77D; }
            .print-btn-container { text-align: center; margin-top: 40px; }
            .print-btn { background: #C4A77D; color: #000; border: none; padding: 12px 30px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; cursor: pointer; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="brand-header">
            <img src="/logo.png" alt="Logo LYJY" />
            <h1>LYJY ATELIER BIJOUX</h1>
          </div>
          <div class="header">
            <div>
              <strong>Bon de Commande :</strong> ${order.id}<br/>
              <strong>Date :</strong> ${order.date || new Date().toLocaleDateString()}<br/>
              ${order.carrier ? `<strong>Transporteur :</strong> ${order.carrier}<br/>` : ''}
              ${order.shipping?.methodName ? `<strong>Livraison :</strong> ${order.shipping.methodName}<br/><strong>Type :</strong> ${order.shipping.servicePointId ? 'Point relais' : 'Domicile'}<br/>` : ''}
              ${order.shipping?.servicePoint ? `<strong>Relais :</strong> ${order.shipping.servicePoint.name}, ${order.shipping.servicePoint.street} ${order.shipping.servicePoint.house_number || ''}, ${order.shipping.servicePoint.postal_code} ${order.shipping.servicePoint.city}<br/>` : ''}
              ${order.giftPackaging?.enabled ? `<strong>Emballage cadeau + carte :</strong> 1,00 €<br/><strong>Message :</strong> ${order.giftPackaging.message || '(aucun message)'}<br/>` : ''}
              ${order.surpriseGift?.included ? `<strong>Cadeau surprise privilège :</strong> À ajouter au colis (offert dès ${order.surpriseGift.threshold} € hors livraison)<br/>` : ''}
              ${order.trackingNumber ? `<strong>N° Suivi :</strong> ${order.trackingNumber}<br/>` : ''}
            </div>
            <div>
              <strong>Client :</strong> ${order.clientName || 'Client'}<br/>
              <strong>E-mail :</strong> ${order.clientEmail || 'N/A'}<br/>
              <strong>Adresse de livraison :</strong><br/>
              ${order.address?.street || order.address || 'N/A'}<br/>
              ${order.address?.postalCode || ''} ${order.address?.city || ''}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Article & Personnalisation</th>
                <th>Quantité</th>
                <th>Prix Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList.map((item: any) => {
                const optionsObj = item.options || {};
                const optionsHtml = Object.keys(optionsObj).length > 0 
                  ? `<div class="options-list">${Object.entries(optionsObj).map(([k, v]) => `<div><strong>${k} :</strong> ${v}</div>`).join('')}</div>`
                  : '';

                const itemTotalPrice = typeof item.price === 'string' 
                  ? item.price 
                  : ((item.price || 0) * (item.quantity || 1)).toFixed(2) + ' €';

                return `
                  <tr>
                    <td>
                      <strong>${item.name || item.title || 'Article'}</strong>
                      ${optionsHtml}
                    </td>
                    <td>${item.quantity || 1}</td>
                    <td>${itemTotalPrice}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div class="total">Total : ${typeof order.total === 'number' ? order.total.toFixed(2) + ' €' : order.total}</div>
          
          <div class="print-btn-container no-print">
            <button class="print-btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const parsedPrice = parseFloat(articlePrice) || 0;
  const parsedReduction = parseFloat(articleReduction) || 0;
  const calculatedFinalPrice = parsedPrice * (1 - parsedReduction / 100);

  // AJOUT D'UN ARTICLE AVEC MULTIPLES PHOTOS
  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleTitle || !articlePrice || !articleCategory) {
      alert("Veuillez remplir les champs obligatoires");
      return;
    }

    setIsSubmittingArticle(true);
    let imageUrls: string[] = ["/logo.png"];

    try {
      if (articleImageFiles && articleImageFiles.length > 0) {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < articleImageFiles.length; i++) {
          const file = articleImageFiles[i];
          const storageRef = ref(storage, `articles/${Date.now()}_${i}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          uploadedUrls.push(downloadUrl);
        }
        imageUrls = uploadedUrls;
      }

      const generatedRef = `LYJY-${Math.floor(100000 + Math.random() * 900000)}`;

      await addDoc(collection(db, "articles"), {
        ref: generatedRef,
        title: articleTitle,
        description: articleDescription,
        price: parsedPrice,
        reduction: parsedReduction,
        finalPrice: calculatedFinalPrice,
        quantity: parseInt(articleQuantity) || 0,
        weight: parseInt(articleWeight) || 0,
        category: articleCategory.toLowerCase(),
        subcategory: articleSubcategory.toLowerCase(),
        theme: articleTheme.toLowerCase(),
        color: articleColor.toLowerCase(),
        imageUrl: imageUrls[0],
        imageUrls: imageUrls,
        isAvailable: true,
        createdAt: new Date().toISOString()
      });

      setSuccessMessage("Article ajouté avec succès !");
      setArticleTitle("");
      setArticleDescription("");
      setArticlePrice("");
      setArticleReduction("0");
      setArticleQuantity("");
      setArticleWeight("");
      setArticleSubcategory("");
      setArticleTheme("");
      setArticleColor("");
      setArticleCategory("");
      setArticleImageFiles(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      alert("Erreur enregistrement article : " + error.message);
    } finally {
      setIsSubmittingArticle(false);
    }
  };

  // AJOUT ET CONFIGURATION D'UN CALENDRIER DE L'AVENT AVEC OPTIONS ACTIVÉES
  const handleCategoryToggleAdvent = (cat: string) => {
    setAdventCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleAddAdventCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adventTitle || !adventPrice) {
      alert("Veuillez remplir les champs obligatoires");
      return;
    }

    const availableCategories = adventCategoryAvailability
      .filter(item => item.isAvailable && adventCategories.includes(item.category))
      .map(item => item.category);

    if (availableCategories.length === 0) {
      alert("Sélectionnez au moins une catégorie de bijoux disponible.");
      return;
    }

    setIsSubmittingAdvent(true);
    let imageUrls: string[] = ["/logo.png"];

    try {
      if (adventImageFiles && adventImageFiles.length > 0) {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < adventImageFiles.length; i++) {
          const file = adventImageFiles[i];
          const storageRef = ref(storage, `articles/advent_${Date.now()}_${i}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          uploadedUrls.push(downloadUrl);
        }
        imageUrls = uploadedUrls;
      }

      const generatedRef = `LYJY-ADV-${Math.floor(100000 + Math.random() * 900000)}`;
      const priceNum = parseFloat(adventPrice) || 0;

      // Filtrer uniquement les options cochées pour l'enregistrement
      const activeAdventOptions = adventOptions.filter(opt => opt.enabled);

      await addDoc(collection(db, "articles"), {
        ref: generatedRef,
        title: adventTitle,
        description: adventDescription,
        price: priceNum,
        reduction: 0,
        finalPrice: priceNum,
        quantity: parseInt(adventStock) || 0,
        category: "calendrier-avent",
        isAdvent: true,
        adventConfig: {
          boxCount: adventBoxCount,
          finish: adventFinish,
          categories: availableCategories,
          options: activeAdventOptions, // Enregistrement des options à cocher actives
        },
        imageUrl: imageUrls[0],
        imageUrls: imageUrls,
        isAvailable: true,
        createdAt: new Date().toISOString()
      });

      setSuccessMessage("Calendrier de l'Avent créé avec succès !");
      setAdventTitle("Calendrier de l'Avent Sur-Mesure");
      setAdventPrice("49.90");
      setAdventStock("10");
      setAdventDescription("");
      setAdventImageFiles(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      alert("Erreur enregistrement du calendrier : " + error.message);
    } finally {
      setIsSubmittingAdvent(false);
    }
  };

  // SAUVEGARDE DE L'ÉDITION D'UN ARTICLE
  const handleSaveEditedArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;

    try {
      let imageUrls = editingArticle.imageUrls || [editingArticle.imageUrl || "/logo.png"];
      
      if (editImageFiles && editImageFiles.length > 0) {
        const newUploadedUrls: string[] = [];
        for (let i = 0; i < editImageFiles.length; i++) {
          const file = editImageFiles[i];
          const storageRef = ref(storage, `articles/${Date.now()}_${i}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          newUploadedUrls.push(downloadUrl);
        }
        imageUrls = [...imageUrls, ...newUploadedUrls];
      }

      const pPrice = parseFloat(editingArticle.price) || 0;
      const pRed = parseFloat(editingArticle.reduction) || 0;
      const fPrice = pPrice * (1 - pRed / 100);

      const articleRef = doc(db, "articles", editingArticle.id);
      const updatedData: any = {
        title: editingArticle.title,
        description: editingArticle.description || "",
        price: pPrice,
        reduction: pRed,
        finalPrice: fPrice,
        quantity: parseInt(editingArticle.quantity) || 0,
        weight: parseInt(editingArticle.weight) || 0,
        category: editingArticle.category.toLowerCase(),
        subcategory: String(editingArticle.subcategory || "").toLowerCase(),
        theme: String(editingArticle.theme || "").toLowerCase(),
        color: String(editingArticle.color || "").toLowerCase(),
        imageUrl: imageUrls[0],
        imageUrls: imageUrls,
      };

      if (editingArticle.isAdvent || editingArticle.category === "calendrier-avent") {
        const selectedCategories = editingArticle.adventConfig?.categories || [];
        updatedData.adventConfig = {
          ...(editingArticle.adventConfig || {}),
          categories: selectedCategories.filter((category: string) =>
            adventCategoryAvailability.some(item => item.category === category && item.isAvailable)
          ),
        };

        if (updatedData.adventConfig.categories.length === 0) {
          alert("Le calendrier doit contenir au moins une catégorie disponible.");
          return;
        }
      }

      if (editingArticle.isCustomGiftCard) {
        const minAmount = Number(editingArticle.giftCardConfig?.minAmount) || 0;
        const maxAmount = Number(editingArticle.giftCardConfig?.maxAmount) || 0;
        if (minAmount <= 0 || maxAmount < minAmount) {
          alert("Vérifiez les montants minimum et maximum de la carte cadeau.");
          return;
        }
        updatedData.giftCardConfig = { minAmount, maxAmount };
        updatedData.price = minAmount;
        updatedData.finalPrice = minAmount;
      }

      await updateDoc(articleRef, updatedData);

      setSuccessMessage("Article mis à jour !");
      setEditingArticle(null);
      setEditImageFiles(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      alert("Erreur mise à jour article : " + err.message);
    }
  };

  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "articles", id), { isAvailable: !currentStatus });
    } catch (error) {
      console.error("Erreur modification statut :", error);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer cet article ?")) {
      try {
        await deleteDoc(doc(db, "articles", id));
        setSuccessMessage("Article supprimé.");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (error) {
        console.error("Erreur suppression :", error);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-[#C4A77D] font-serif">
        Chargement de l'administration...
      </div>
    );
  }

  if (!currentUser) {
    return <AdminLoginPanel isDayMode={isDayMode} error={loginError} email={loginEmail} password={loginPassword} onEmail={setLoginEmail} onPassword={setLoginPassword} onSubmit={handleLogin} />;
  }

  if (!adminAllowed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-stone-200 p-6">
        <div className="max-w-md text-center space-y-4 border border-red-900/50 p-8">
          <Shield className="mx-auto text-red-400" />
          <h1 className="text-xl text-[#C4A77D]">Accès non autorisé</h1>
          <p className="text-sm text-stone-400">Ce compte n’est pas présent dans la liste des administrateurs.</p>
          <button onClick={() => signOut(auth)} className="text-xs uppercase tracking-widest text-[#C4A77D]">Se déconnecter</button>
        </div>
      </main>
    );
  }

  const filteredOrders = orders.filter((o) => o.status === orderSubTab);
  const filteredArticles = articles.filter((article) => {
    const matchesCategory = articleFilterCategory === "all" || article.category === articleFilterCategory.toLowerCase();
    const search = articleSearchRef.trim().toLowerCase();
    return matchesCategory && (!search || String(article.ref || "").toLowerCase().includes(search));
  });

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
          <ArrowLeft className="w-4 h-4" /> Boutique
        </Link>
        
        <h1 className="text-lg font-serif tracking-[0.2em] text-[#C4A77D]">Administration LYJY</h1>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleDayMode}
            className="flex items-center gap-2 cursor-pointer text-xs tracking-[0.2em] uppercase font-light"
          >
            {isDayMode ? <Moon className="w-4 h-4 text-stone-700" /> : <Sun className="w-4 h-4 text-yellow-500" />}
            <span>{isDayMode ? "Nuit" : "Jour"}</span>
          </button>
          <button onClick={() => setActiveTab("tutorial")} className={`pb-2 transition-colors ${activeTab === "tutorial" ? "text-[#C4A77D] border-b-2 border-[#C4A77D]" : "text-stone-500 hover:text-stone-300"}`}>Tutoriel</button>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 uppercase tracking-widest border border-red-500/30 px-3 py-1"
            title="Déconnexion"
          >
            <LogOut className="w-3 h-3" /> Quitter
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full space-y-6">

        {/* DASHBOARD STATISTIQUES (KPIs) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-5 border space-y-2 ${isDayMode ? "bg-white border-stone-200" : "bg-stone-950 border-stone-900"}`}>
            <div className="flex justify-between items-center text-stone-500">
              <span className="text-xs uppercase tracking-widest">Chiffre d'Affaires</span>
              <Euro className="w-4 h-4 text-[#C4A77D]" />
            </div>
            <p className="text-2xl font-serif text-[#C4A77D]">{totalRevenue.toFixed(2)} €</p>
          </div>

          <div className={`p-5 border space-y-2 ${isDayMode ? "bg-white border-stone-200" : "bg-stone-950 border-stone-900"}`}>
            <div className="flex justify-between items-center text-stone-500">
              <span className="text-xs uppercase tracking-widest">Commandes Validées</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-serif">{orders.filter(o => o.status !== "cancelled" && (!statsSince || new Date(o.createdAt || o.date || 0).getTime() >= statsSince)).length}</p>
          </div>

          <div className={`p-5 border space-y-2 ${isDayMode ? "bg-white border-stone-200" : "bg-stone-950 border-stone-900"}`}>
            <div className="flex justify-between items-center text-stone-500">
              <span className="text-xs uppercase tracking-widest">Alerte Stock Faible</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-serif text-amber-500">{lowStockArticles.length} bijou(x)</p>
          </div>
        </div>
        <button type="button" onClick={() => { const now = Date.now(); localStorage.setItem("lyjy_stats_since", String(now)); setStatsSince(now); }} className="text-[10px] uppercase tracking-widest text-stone-500 hover:text-[#C4A77D]">Remettre les statistiques à zéro</button>

        {/* NAVIGATION DES ONGLETS */}
        <div className="flex gap-4 border-b border-stone-800 pb-4 text-xs tracking-[0.2em] uppercase flex-wrap">
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-2 transition-colors ${activeTab === "orders" ? "text-[#C4A77D] border-b-2 border-[#C4A77D]" : "text-stone-500 hover:text-stone-300"}`}
          >
            Commandes ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("articles")}
            className={`pb-2 transition-colors ${activeTab === "articles" ? "text-[#C4A77D] border-b-2 border-[#C4A77D]" : "text-stone-500 hover:text-stone-300"}`}
          >
            Articles ({articles.length})
          </button>
          <button
            onClick={() => setActiveTab("advent")}
            className={`pb-2 transition-colors ${activeTab === "advent" ? "text-[#C4A77D] border-b-2 border-[#C4A77D]" : "text-stone-500 hover:text-stone-300"}`}
          >
            Calendrier Avent ({adventArticles.length})
          </button>
          <button
            onClick={() => setActiveTab("coupons")}
            className={`pb-2 transition-colors ${activeTab === "coupons" ? "text-[#C4A77D] border-b-2 border-[#C4A77D]" : "text-stone-500 hover:text-stone-300"}`}
          >
            Codes Promo ({coupons.length})
          </button>
          <button
            onClick={() => setActiveTab("giftCards")}
            className={`pb-2 transition-colors ${activeTab === "giftCards" ? "text-[#C4A77D] border-b-2 border-[#C4A77D]" : "text-stone-500 hover:text-stone-300"}`}
          >
            Cartes Cadeaux ({giftCards.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-2 transition-colors ${activeTab === "users" ? "text-[#C4A77D] border-b-2 border-[#C4A77D]" : "text-stone-500 hover:text-stone-300"}`}
          >
            Inscrits ({users.length})
          </button>
        </div>

        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs p-3 flex items-center gap-2">
            <Check className="w-4 h-4" /> {successMessage}
          </div>
        )}

        {activeTab === "tutorial" && <AdminTutorial />}

        {/* ONGLET COMMANDES */}
        {activeTab === "orders" && (
          <div className={`p-8 border space-y-6 ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
            <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] flex items-center gap-2">
              <Package className="w-5 h-5" /> Suivi et Gestion des Commandes
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs tracking-widest uppercase">
              {[
                { id: "preparing", label: "À préparer", icon: Clock },
                { id: "ready", label: "Prêtes", icon: CheckCircle2 },
                { id: "shipping", label: "À expédier", icon: Send },
                { id: "sent", label: "Expédiées", icon: Package },
                { id: "cancelled", label: "Annulées", icon: X },
              ].map((sub) => {
                const IconComponent = sub.icon;
                const count = orders.filter(o => o.status === sub.id).length;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setOrderSubTab(sub.id)}
                    className={`p-3 border flex items-center justify-center gap-2 transition-all ${
                      orderSubTab === sub.id
                        ? "border-[#C4A77D] text-[#C4A77D] bg-[#C4A77D]/10"
                        : isDayMode ? "border-stone-200 text-stone-500" : "border-stone-900 text-stone-400"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" /> {sub.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="overflow-x-auto pt-4">
              <table className="w-full text-left text-xs tracking-wider">
                <thead>
                  <tr className={`border-b uppercase tracking-widest text-stone-500 ${isDayMode ? "border-stone-200" : "border-stone-900"}`}>
                    <th className="pb-3 font-light">N° Commande</th>
                    <th className="pb-3 font-light">Client</th>
                    <th className="pb-3 font-light">Date</th>
                    <th className="pb-3 font-light">Total</th>
                    <th className="pb-3 font-light text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-900/50">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-stone-500 italic">Aucune commande dans cette catégorie.</td></tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.docId} className="hover:bg-stone-900/10 transition-colors">
                        <td className="py-4 font-serif text-sm text-[#C4A77D]">{order.id}</td>
                        <td className="py-4">
                          <button onClick={() => setSelectedOrderDetails(order)} className="hover:text-[#C4A77D] underline text-left">
                            {order.clientName || order.clientEmail || 'Client'}
                          </button>
                        </td>
                        <td className="py-4 text-stone-400">{order.date || new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="py-4 font-light">{typeof order.total === 'number' ? order.total.toFixed(2) + ' €' : order.total}</td>
                        <td className="py-4 text-right space-x-2">
                          <button onClick={() => handleGenerateInvoice(order)} className="px-2 py-1 border border-[#C4A77D] text-[#C4A77D] text-[10px] uppercase hover:bg-[#C4A77D] hover:text-black inline-flex items-center gap-1" title="Bon de commande">
                            <FileText className="w-3 h-3" /> Bon
                          </button>
                          <button onClick={() => handleDeleteOrder(order)} className="px-2 py-1 border border-red-700 text-red-500 hover:bg-red-600 hover:text-white" title="Supprimer la commande"><Trash2 className="w-3 h-3" /></button>
                          {orderSubTab !== "cancelled" && orderSubTab !== "sent" && (
                             <button onClick={() => handleCancelAndRefundOrder(order)} className="px-2 py-1 border border-red-500 text-red-500 text-[10px] uppercase hover:bg-red-500 hover:text-white">
                               Annuler & Rembourser
                             </button>
                          )}
                          {orderSubTab === "preparing" && (
                            <button onClick={() => handleUpdateOrderStatus(order.docId, "ready")} className="px-3 py-1 bg-[#C4A77D] text-black text-[10px] uppercase hover:bg-[#b3956c]">Prêt →</button>
                          )}
                          {orderSubTab === "ready" && (
                            <button onClick={() => handleUpdateOrderStatus(order.docId, "shipping")} className="px-3 py-1 bg-[#C4A77D] text-black text-[10px] uppercase hover:bg-[#b3956c]">À expédier →</button>
                          )}
                          {orderSubTab === "shipping" && (
                            <button 
                              onClick={() => setShippingOrder(order)} 
                              className="px-3 py-1 bg-[#C4A77D] text-black text-[10px] uppercase hover:bg-[#b3956c] inline-flex items-center gap-1"
                            >
                              <Truck className="w-3 h-3" /> Expédier →
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ONGLET ARTICLES */}
        {activeTab === "articles" && (
          <div className="space-y-8">
            <CatalogTaxonomyManager taxonomy={catalogTaxonomy} isDayMode={isDayMode} onChange={setCatalogTaxonomy} />

            <div className={`p-8 border space-y-6 ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
              <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] flex items-center gap-2">
                <Plus className="w-5 h-5" /> Ajouter un nouvel article
              </h2>

              <form onSubmit={handleAddArticle} className="space-y-4 text-xs tracking-wider">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Titre de l'article *</label>
                    <input 
                      type="text" required value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)}
                      placeholder="Ex: Collier Éclat d'Or"
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Poids de l'article (g)</label>
                    <input type="number" min="0" step="1" value={articleWeight} onChange={(e) => setArticleWeight(e.target.value)} placeholder="Ex: 80"
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`} />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Catégorie *</label>
                    <select
                      value={articleCategory} onChange={(e) => setArticleCategory(e.target.value)}
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`} required
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {catalogTaxonomy.categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.label}{cat.isVisible ? "" : " (masquée)"}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {([
                    { label: "Sous-catégorie", value: articleSubcategory, setter: setArticleSubcategory, items: catalogTaxonomy.subcategories },
                    { label: "Thème", value: articleTheme, setter: setArticleTheme, items: catalogTaxonomy.themes },
                    { label: "Couleur", value: articleColor, setter: setArticleColor, items: catalogTaxonomy.colors },
                  ]).map(field => (
                    <div key={field.label}>
                      <label className="block uppercase text-stone-500 mb-1">{field.label}</label>
                      <select value={field.value} onChange={(e) => field.setter(e.target.value)} className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300" : "bg-black border-stone-800"}`}>
                        <option value="">Aucun(e)</option>
                        {field.items.map(item => <option key={item.id} value={item.id}>{item.label}{item.isVisible ? "" : " (masqué)"}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Prix initial (€) *</label>
                    <input 
                      type="number" step="0.01" required value={articlePrice} onChange={(e) => setArticlePrice(e.target.value)}
                      placeholder="120"
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Réduction (%)</label>
                    <input 
                      type="number" min="0" max="100" value={articleReduction} onChange={(e) => setArticleReduction(e.target.value)}
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Prix Final Client</label>
                    <div className={`w-full p-3 border text-sm font-serif text-[#C4A77D] ${isDayMode ? "bg-stone-200 border-stone-300" : "bg-stone-900 border-stone-800"}`}>
                      {calculatedFinalPrice.toFixed(2)} €
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Quantité en stock</label>
                    <input 
                      type="number" value={articleQuantity} onChange={(e) => setArticleQuantity(e.target.value)} placeholder="10"
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Photos de l'article (Plusieurs possibles)</label>
                    <input 
                      type="file" accept="image/*" multiple onChange={(e) => setArticleImageFiles(e.target.files)}
                      className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:bg-[#C4A77D] file:text-black hover:file:bg-[#b3956c]"
                    />
                    {articleImageFiles && articleImageFiles.length > 0 && (
                      <span className="text-[10px] text-[#C4A77D] mt-1 block">{articleImageFiles.length} fichier(s) sélectionné(s)</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block uppercase text-stone-500 mb-1">Description</label>
                  <textarea 
                    rows={3} value={articleDescription} onChange={(e) => setArticleDescription(e.target.value)} placeholder="Description..."
                    className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                  />
                </div>

                <button 
                  type="submit" disabled={isSubmittingArticle}
                  className="bg-[#C4A77D] text-black px-6 py-3 text-xs tracking-[0.3em] uppercase hover:bg-[#b3956c] transition-colors font-medium"
                >
                  {isSubmittingArticle ? "Enregistrement..." : "Créer l'article"}
                </button>
              </form>
            </div>

            <div className={`p-8 border space-y-6 ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 border-stone-800">
                <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] flex items-center gap-2">
                  <Package className="w-5 h-5" /> Catalogue des Articles ({filteredArticles.length})
                </h2>

                <div className="flex items-center gap-2 text-xs">
                  <span className="uppercase tracking-widest text-stone-500">Filtrer :</span>
                  <select
                    value={articleFilterCategory} onChange={(e) => setArticleFilterCategory(e.target.value)}
                    className={`p-2 border ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-200"}`}
                  >
                    <option value="all">Toutes les catégories</option>
                    {catalogTaxonomy.categories.filter(item => item.isVisible).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                  <input type="search" value={articleSearchRef} onChange={(e) => setArticleSearchRef(e.target.value)} placeholder="Rechercher par référence…" className={`p-2 border ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-200"}`} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs tracking-wider">
                  <thead>
                    <tr className={`border-b uppercase tracking-widest text-stone-500 ${isDayMode ? "border-stone-200" : "border-stone-900"}`}>
                      <th className="pb-3 font-light">Images</th>
                      <th className="pb-3 font-light">Réf / Titre</th>
                      <th className="pb-3 font-light">Catégorie</th>
                      <th className="pb-3 font-light">Prix</th>
                      <th className="pb-3 font-light">Stock</th>
                      <th className="pb-3 font-light">Statut</th>
                      <th className="pb-3 font-light text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-900/50">
                    {filteredArticles.length === 0 ? (
                      <tr><td colSpan={7} className="py-8 text-center text-stone-500 italic">Aucun article dans cette catégorie.</td></tr>
                    ) : (
                      filteredArticles.map((art) => (
                        <tr key={art.id} className="hover:bg-stone-900/10 transition-colors">
                          <td className="py-4">
                            <div className="flex items-center gap-1">
                              <img src={art.imageUrl || "/logo.png"} alt={art.title} className="w-10 h-10 object-cover border border-stone-700" />
                              {art.imageUrls && art.imageUrls.length > 1 && (
                                <span className="text-[10px] bg-[#C4A77D]/20 text-[#C4A77D] px-1 py-0.5 rounded">
                                  +{art.imageUrls.length - 1}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="block font-serif text-sm text-[#C4A77D]">{art.title}</span>
                            <span className="text-[10px] text-stone-500">Réf : {art.ref}</span>
                          </td>
                          <td className="py-4 text-stone-400 uppercase">{art.category}</td>
                          <td className="py-4">
                            {art.reduction > 0 ? (
                              <div>
                                <span className="line-through text-stone-500 text-[10px]">{art.price} €</span>
                                <span className="text-[#C4A77D] font-medium ml-1">{art.finalPrice?.toFixed(2)} €</span>
                                <span className="block text-[9px] text-green-400">-{art.reduction}%</span>
                              </div>
                            ) : (
                              <span>{art.price} €</span>
                            )}
                          </td>
                          <td className="py-4 text-stone-400">{art.quantity}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 text-[10px] uppercase ${art.isAvailable !== false ? "bg-green-500/15 text-green-400 border border-green-500/30" : "bg-red-500/15 text-red-400 border border-red-500/30"}`}>
                              {art.isAvailable !== false ? "Disponible" : "Non dispo"}
                            </span>
                          </td>
                          <td className="py-4 text-right space-x-2">
                            <button
                              onClick={() => setEditingArticle(art)}
                              className="p-2 border border-stone-600 text-stone-300 hover:border-[#C4A77D] hover:text-[#C4A77D]"
                              title="Modifier l'article"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleToggleAvailability(art.id, art.isAvailable !== false)}
                              className="p-2 border border-stone-600 text-stone-300 hover:border-[#C4A77D] hover:text-[#C4A77D]"
                              title="Changer la disponibilité"
                            >
                              {art.isAvailable !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() => handleDeleteArticle(art.id)}
                              className="text-red-400 hover:text-red-300 p-2"
                              title="Supprimer l'article"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET CALENDRIER DE L'AVENT */}
        {activeTab === "advent" && (
          <div className="space-y-8">
            {/* BLOC DE CONFIGURATION GLOBALE DE L'AVENT (LIÉ À FIRESTORE) */}
            <div className={`p-8 border space-y-6 ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
              <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] flex items-center gap-2">
                <Settings className="w-5 h-5" /> Paramètres Globaux du Calendrier de l'Avent
              </h2>

              <form onSubmit={handleSaveAdventGlobalConfig} className="space-y-6 text-xs tracking-wider">
                <div className="flex items-center justify-between p-4 border border-stone-800 bg-black/40">
                  <div>
                    <span className="font-serif text-sm block text-stone-200">Activer le Calendrier de l'Avent sur la boutique</span>
                    <span className="text-[10px] text-stone-500">Permet d'afficher l'offre et l'accès au configurateur pour les clients.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={adventEnabled} 
                      onChange={(e) => setAdventEnabled(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C4A77D]"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Prix de Base Global (€)</label>
                    <input 
                      type="number" step="0.01" value={adventBasePrice} onChange={(e) => setAdventBasePrice(e.target.value)}
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Message d'information / Bannière</label>
                    <input 
                      type="text" value={adventNoticeMessage} onChange={(e) => setAdventNoticeMessage(e.target.value)}
                      placeholder="Ex: Édition limitée de Noël 2026 !"
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                </div>

                <button 
                  type="submit" disabled={isSavingAdventConfig}
                  className="bg-[#C4A77D] text-black px-6 py-3 text-xs tracking-[0.3em] uppercase hover:bg-[#b3956c] transition-colors font-medium flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> {isSavingAdventConfig ? "Enregistrement..." : "Sauvegarder les paramètres globaux"}
                </button>
              </form>
            </div>

            {/* CRÉATION D'UN CALENDRIER VIRTUEL AVEC BONS DE RÉDUCTION */}
            <div className={`p-8 border space-y-6 ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
              <div>
                <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] flex items-center gap-2">
                  <Gift className="w-5 h-5" /> Créer un Calendrier de l&apos;Avent Virtuel
                </h2>
                <p className="mt-2 text-xs text-stone-500">
                  Chaque case active crée automatiquement un code promo utilisable dans le panier.
                </p>
              </div>

              {virtualAdventCalendars.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs uppercase tracking-widest text-stone-500">Calendriers créés</h3>
                  {virtualAdventCalendars.map((calendar) => (
                    <div key={calendar.id} className="flex items-center justify-between border border-stone-800 p-3">
                      <div>
                        <p className="text-sm text-[#C4A77D]">{calendar.title}</p>
                        <p className="text-[10px] text-stone-500">{calendar.startDate} → {calendar.endDate}</p>
                      </div>
                      <button type="button" onClick={() => handleDeleteVirtualAdvent(calendar.id)} className="text-red-400 hover:text-red-300" aria-label="Supprimer le calendrier">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleCreateVirtualAdvent} className="space-y-6 text-xs tracking-wider">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Titre *</label>
                    <input
                      type="text"
                      required
                      value={virtualAdventTitle}
                      onChange={(e) => setVirtualAdventTitle(e.target.value)}
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Date de début *</label>
                    <input
                      type="date"
                      required
                      value={virtualAdventStartDate}
                      onChange={(e) => setVirtualAdventStartDate(e.target.value)}
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Date de fin *</label>
                    <input
                      type="date"
                      required
                      value={virtualAdventEndDate}
                      onChange={(e) => setVirtualAdventEndDate(e.target.value)}
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {virtualAdventRewards.map((reward) => (
                    <div
                      key={reward.day}
                      className={`p-4 border space-y-3 ${
                        reward.enabled
                          ? "border-[#C4A77D]/50 bg-[#C4A77D]/5"
                          : isDayMode ? "border-stone-300 bg-stone-200/40 opacity-60" : "border-stone-800 bg-black/40 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-sm text-[#C4A77D]">Case {reward.day}</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-[9px] uppercase text-stone-500">Active</span>
                          <input
                            type="checkbox"
                            checked={reward.enabled}
                            onChange={(e) => handleUpdateVirtualReward(reward.day, "enabled", e.target.checked)}
                            className="w-4 h-4 accent-[#C4A77D]"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={reward.discountType}
                          disabled={!reward.enabled}
                          onChange={(e) => handleUpdateVirtualReward(reward.day, "discountType", e.target.value)}
                          className={`p-2 border ${isDayMode ? "bg-white border-stone-300" : "bg-black border-stone-800"}`}
                        >
                          <option value="percent">Pourcentage (%)</option>
                          <option value="fixed">Montant (€)</option>
                        </select>
                        <input
                          type="number"
                          min="0.01"
                          max={reward.discountType === "percent" ? "100" : undefined}
                          step="0.01"
                          disabled={!reward.enabled}
                          value={reward.discountValue}
                          onChange={(e) => handleUpdateVirtualReward(reward.day, "discountValue", e.target.value)}
                          className={`p-2 border ${isDayMode ? "bg-white border-stone-300" : "bg-black border-stone-800"}`}
                          aria-label={`Réduction de la case ${reward.day}`}
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-[9px] uppercase text-stone-500">
                          Montant minimum du panier (€)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={!reward.enabled}
                          value={reward.minimumAmount}
                          onChange={(e) => handleUpdateVirtualReward(reward.day, "minimumAmount", e.target.value)}
                          className={`w-full p-2 border ${isDayMode ? "bg-white border-stone-300" : "bg-black border-stone-800"}`}
                          aria-label={`Montant minimum de la case ${reward.day}`}
                        />
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          disabled={!reward.enabled}
                          value={reward.code}
                          onChange={(e) => handleUpdateVirtualReward(reward.day, "code", e.target.value.toUpperCase())}
                          placeholder="Code automatique"
                          className={`min-w-0 flex-1 p-2 border uppercase ${isDayMode ? "bg-white border-stone-300" : "bg-black border-stone-800"}`}
                        />
                        <button
                          type="button"
                          disabled={!reward.enabled}
                          onClick={() => handleUpdateVirtualReward(reward.day, "code", generateRandomCode(`AVENT${reward.day}`))}
                          className="px-3 border border-[#C4A77D]/50 text-[#C4A77D] disabled:opacity-40"
                          title="Générer un code"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingVirtualAdvent}
                  className="bg-[#C4A77D] text-black px-6 py-3 text-xs tracking-[0.3em] uppercase hover:bg-[#b3956c] transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isSubmittingVirtualAdvent ? "Création en cours..." : "Créer le calendrier virtuel et ses bons"}
                </button>
              </form>
            </div>

            {/* FORMULAIRE DE CRÉATION D'UNE OFFRE DE CALENDRIER */}
            <div className={`p-8 border space-y-6 ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
              <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Configurer une Offre de Calendrier de l'Avent (Catalogue)
              </h2>

              <form onSubmit={handleAddAdventCalendar} className="space-y-6 text-xs tracking-wider">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Titre de l'offre *</label>
                    <input 
                      type="text" required value={adventTitle} onChange={(e) => setAdventTitle(e.target.value)}
                      placeholder="Ex: Calendrier de l'Avent Merveilleux"
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Prix (€) *</label>
                    <input 
                      type="number" step="0.01" required value={adventPrice} onChange={(e) => setAdventPrice(e.target.value)}
                      placeholder="49.90"
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Stock Initial *</label>
                    <input 
                      type="number" required value={adventStock} onChange={(e) => setAdventStock(e.target.value)}
                      placeholder="10"
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                </div>

                {/* SÉLECTION DU NOMBRE DE CASES */}
                <div>
                  <label className="block uppercase text-stone-500 mb-2">Nombre de cases (Choix possible)</label>
                  <div className="flex gap-3">
                    {[6, 12, 24].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setAdventBoxCount(count)}
                        className={`px-5 py-2.5 border text-xs tracking-widest uppercase transition-colors ${
                          adventBoxCount === count
                            ? "bg-[#C4A77D] text-black border-[#C4A77D] font-medium"
                            : isDayMode ? "bg-white border-stone-300 text-stone-700" : "bg-black border-stone-800 text-stone-400"
                        }`}
                      >
                        {count} Cases
                      </button>
                    ))}
                  </div>
                </div>

                {/* SÉLECTION DE LA FINITION DES BIJOUX */}
                <div>
                  <label className="block uppercase text-stone-500 mb-2">Finition des bijoux inclus</label>
                  <div className="flex gap-3 flex-wrap">
                    {[
                      { id: "dore", label: "Doré à l'or fin" },
                      { id: "argente", label: "Argenté" },
                      { id: "mixte", label: "Mixte (Doré & Argenté)" }
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setAdventFinish(f.id)}
                        className={`px-5 py-2.5 border text-xs tracking-widest uppercase transition-colors ${
                          adventFinish === f.id
                            ? "bg-[#C4A77D] text-black border-[#C4A77D] font-medium"
                            : isDayMode ? "bg-white border-stone-300 text-stone-700" : "bg-black border-stone-800 text-stone-400"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* NOUVEAU : SYSTÈME DE CASES À COCHER POUR ACTIVER/DÉSACTIVER LES OPTIONS DU CALENDRIER */}
                <div>
                  <label className="block uppercase text-stone-500 mb-2">
                    Options incluses / activables pour ce calendrier
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {adventOptions.map((opt) => (
                      <label 
                        key={opt.id} 
                        className={`flex items-center justify-between p-3 border cursor-pointer transition-colors ${
                          opt.enabled 
                            ? "border-[#C4A77D] bg-[#C4A77D]/10 text-[#C4A77D]" 
                            : isDayMode ? "border-stone-300 bg-white text-stone-600" : "border-stone-800 bg-black text-stone-400"
                        }`}
                      >
                        <span className="uppercase tracking-wider text-[11px] font-medium">{opt.label}</span>
                        <input 
                          type="checkbox" 
                          checked={opt.enabled} 
                          onChange={() => handleToggleAdventOption(opt.id)}
                          className="w-4 h-4 accent-[#C4A77D] cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* SELECTION DES CATEGORIES DANS LE TIRAGE ALEATOIRE */}
                <div>
                  <label className="block uppercase text-stone-500 mb-2">
                    Catégories de bijoux incluses dans le tirage aléatoire
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {adventCategoryAvailability.map(({ category: cat, availableStock, isAvailable }) => {
                      const isSelected = adventCategories.includes(cat) && isAvailable;
                      return (
                        <label
                          key={cat}
                          className={`p-3 border text-left flex items-center justify-between uppercase tracking-wider text-[11px] transition-colors ${
                            isSelected
                              ? "border-[#C4A77D] text-[#C4A77D] bg-[#C4A77D]/10"
                              : isAvailable
                                ? isDayMode ? "border-stone-300 bg-white text-stone-600" : "border-stone-800 bg-black text-stone-400"
                                : "border-red-500/30 bg-red-500/5 text-red-400/70 cursor-not-allowed"
                          }`}
                        >
                          <span>
                            <span className="block">{cat}</span>
                            <span className="block mt-1 text-[9px] normal-case tracking-normal">
                              {isAvailable ? `${availableStock} en stock` : "Indisponible"}
                            </span>
                          </span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isAvailable}
                            onChange={() => handleCategoryToggleAdvent(cat)}
                            className="w-4 h-4 accent-[#C4A77D]"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Visuels de présentation (Photos)</label>
                    <input 
                      type="file" accept="image/*" multiple onChange={(e) => setAdventImageFiles(e.target.files)}
                      className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:bg-[#C4A77D] file:text-black hover:file:bg-[#b3956c]"
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Description / Composition</label>
                    <textarea 
                      rows={2} value={adventDescription} onChange={(e) => setAdventDescription(e.target.value)}
                      placeholder="Indiquez les détails ou surprises incluses..."
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                </div>

                <button 
                  type="submit" disabled={isSubmittingAdvent}
                  className="bg-[#C4A77D] text-black px-6 py-3 text-xs tracking-[0.3em] uppercase hover:bg-[#b3956c] transition-colors font-medium flex items-center gap-2"
                >
                  <Gift className="w-4 h-4" /> {isSubmittingAdvent ? "Enregistrement..." : "Créer le Calendrier de l'Avent"}
                </button>
              </form>
            </div>

            {/* LISTE DES CALENDRIERS DE L'AVENT ACTIFS */}
            <div className={`p-8 border space-y-6 ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
              <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] flex items-center gap-2">
                <Gift className="w-5 h-5" /> Calendriers de l'Avent en Vente ({adventArticles.length})
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs tracking-wider">
                  <thead>
                    <tr className={`border-b uppercase tracking-widest text-stone-500 ${isDayMode ? "border-stone-200" : "border-stone-900"}`}>
                      <th className="pb-3 font-light">Visuel</th>
                      <th className="pb-3 font-light">Réf / Offre</th>
                      <th className="pb-3 font-light">Configuration</th>
                      <th className="pb-3 font-light">Prix</th>
                      <th className="pb-3 font-light">Stock</th>
                      <th className="pb-3 font-light">Statut</th>
                      <th className="pb-3 font-light text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-900/50">
                    {adventArticles.length === 0 ? (
                      <tr><td colSpan={7} className="py-8 text-center text-stone-500 italic">Aucun calendrier de l'avent pour le moment.</td></tr>
                    ) : (
                      adventArticles.map((adv) => (
                        <tr key={adv.id} className="hover:bg-stone-900/10 transition-colors">
                          <td className="py-4">
                            <img src={adv.imageUrl || "/logo.png"} alt={adv.title} className="w-10 h-10 object-cover border border-stone-700" />
                          </td>
                          <td className="py-4">
                            <span className="block font-serif text-sm text-[#C4A77D]">{adv.title}</span>
                            <span className="text-[10px] text-stone-500">Réf : {adv.ref}</span>
                          </td>
                          <td className="py-4 text-stone-400">
                            <div>{adv.adventConfig?.boxCount || 24} Cases • Finition {adv.adventConfig?.finish || 'mixte'}</div>
                            <div className="text-[10px] text-stone-500">
                              Options actives : {adv.adventConfig?.options?.map((o: any) => o.label).join(', ') || 'Aucune'}
                            </div>
                          </td>
                          <td className="py-4 font-medium text-[#C4A77D]">{adv.price} €</td>
                          <td className="py-4 text-stone-400">{adv.quantity}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 text-[10px] uppercase ${adv.isAvailable !== false ? "bg-green-500/15 text-green-400 border border-green-500/30" : "bg-red-500/15 text-red-400 border border-red-500/30"}`}>
                              {adv.isAvailable !== false ? "En ligne" : "Masqué"}
                            </span>
                          </td>
                          <td className="py-4 text-right space-x-2">
                            <button
                              onClick={() => handleToggleAvailability(adv.id, adv.isAvailable !== false)}
                              className="p-2 border border-stone-600 text-stone-300 hover:border-[#C4A77D] hover:text-[#C4A77D]"
                              title="Afficher/Masquer"
                            >
                              {adv.isAvailable !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteArticle(adv.id)}
                              className="text-red-400 hover:text-red-300 p-2"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET CODES PROMO */}
        {activeTab === "coupons" && (
          <div className="space-y-6">
            <div className={`p-8 border space-y-6 ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
              <div className="flex justify-between items-center">
                <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] flex items-center gap-2">
                  <Tag className="w-5 h-5" /> Créer un Code Promo Avancé
                </h2>
                <button
                  type="button"
                  onClick={() => setPromoCode(generateRandomCode("LYJY"))}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-widest bg-[#C4A77D]/10 border border-[#C4A77D]/40 text-[#C4A77D] px-3 py-1.5 hover:bg-[#C4A77D] hover:text-black transition-colors"
                >
                  <Wand2 className="w-3 h-3" /> Générer un code auto
                </button>
              </div>

              <form onSubmit={handleAddCoupon} className="space-y-4 text-xs tracking-wider">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Code Promo *</label>
                    <input 
                      type="text" required value={promoCode} onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Ex: BIENVENUE10"
                      className={`w-full p-3 border text-sm uppercase ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Type de Réduction *</label>
                    <select
                      value={promoType} onChange={(e) => setPromoType(e.target.value)}
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    >
                      <option value="percent">Pourcentage (%)</option>
                      <option value="fixed">Montant Fixe (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Valeur *</label>
                    <input 
                      type="number" step="0.01" required value={promoValue} onChange={(e) => setPromoValue(e.target.value)}
                      placeholder="Ex: 10"
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block uppercase text-stone-500 mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#C4A77D]" /> Nombre d'utilisations Max (Optionnel)
                    </label>
                    <input 
                      type="number" min="1" value={promoMaxUses} onChange={(e) => setPromoMaxUses(e.target.value)}
                      placeholder="Ex: 50 (laisser vide si illimité)"
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                    <span className="text-[10px] text-stone-500 mt-1 block">Chaque utilisateur ne pourra l'utiliser qu'une seule fois.</span>
                  </div>

                  <div>
                    <label className="block uppercase text-stone-500 mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#C4A77D]" /> Date d'expiration (Optionnel)
                    </label>
                    <input 
                      type="date" value={promoExpiration} onChange={(e) => setPromoExpiration(e.target.value)}
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                    <span className="text-[10px] text-stone-500 mt-1 block">Valide jusqu'à la fin de cette journée.</span>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="bg-[#C4A77D] text-black px-6 py-3 text-xs tracking-[0.3em] uppercase hover:bg-[#b3956c] transition-colors font-medium"
                >
                  Enregistrer le Code Promo
                </button>
              </form>
            </div>

            <div className={`p-8 border ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
              <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] mb-6 flex items-center gap-2">
                <Tag className="w-5 h-5" /> Liste des Codes Promo Actifs ({coupons.length})
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs tracking-wider">
                  <thead>
                    <tr className={`border-b uppercase tracking-widest text-stone-500 ${isDayMode ? "border-stone-200" : "border-stone-900"}`}>
                      <th className="pb-3 font-light">Code</th>
                      <th className="pb-3 font-light">Réduction</th>
                      <th className="pb-3 font-light">Utilisations</th>
                      <th className="pb-3 font-light">Expiration</th>
                      <th className="pb-3 font-light">Règle Client</th>
                      <th className="pb-3 font-light text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-900/50">
                    {coupons.length === 0 ? (
                      <tr><td colSpan={6} className="py-6 text-center text-stone-500 italic">Aucun code promo configuré.</td></tr>
                    ) : (
                      coupons.map((c) => {
                        const isExpired = c.expirationDate && new Date(c.expirationDate) < new Date();
                        const isMaxReached = c.maxUses && (c.currentUses || 0) >= c.maxUses;

                        return (
                          <tr key={c.id} className="hover:bg-stone-900/10 transition-colors">
                            <td className="py-4 font-mono font-bold text-sm text-[#C4A77D] uppercase">{c.code}</td>
                            <td className="py-4 text-stone-300 font-medium">
                              {c.discountValue} {c.discountType === "percent" ? "%" : "€"}
                            </td>
                            <td className="py-4 text-stone-400">
                              {c.currentUses || 0} / {c.maxUses ? c.maxUses : "∞"}
                              {isMaxReached && <span className="block text-[9px] text-red-400">Épuisé</span>}
                            </td>
                            <td className="py-4 text-stone-400">
                              {c.expirationDate ? new Date(c.expirationDate).toLocaleDateString() : "Permanente"}
                              {isExpired && <span className="block text-[9px] text-red-400">Expiré</span>}
                            </td>
                            <td className="py-4 text-stone-400">
                              <span className="px-2 py-0.5 border border-stone-700 text-[10px] uppercase">
                                1x / Utilisateur
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <button onClick={() => handleDeleteCoupon(c.id)} className="text-red-400 hover:text-red-300 p-2" title="Supprimer">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET CARTES CADEAUX */}
        {activeTab === "giftCards" && (
          <div className="space-y-6">
            <div className={`p-8 border space-y-6 ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
              <div>
                <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] flex items-center gap-2">
                  <Gift className="w-5 h-5" /> Créer une Offre de Carte Cadeau Sur-Mesure
                </h2>
                <p className="mt-2 text-xs text-stone-500">Cette offre apparaîtra dans la boutique et permettra au client de choisir librement son montant et son message.</p>
              </div>

              <form onSubmit={handleCreateCustomGiftCardProduct} className="space-y-4 text-xs tracking-wider">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Titre de l&apos;offre *</label>
                    <input type="text" required value={customGiftCardTitle} onChange={(e) => setCustomGiftCardTitle(e.target.value)} className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300" : "bg-black border-stone-800"}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block uppercase text-stone-500 mb-1">Minimum (€) *</label>
                      <input type="number" min="1" step="1" required value={customGiftCardMinAmount} onChange={(e) => setCustomGiftCardMinAmount(e.target.value)} className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300" : "bg-black border-stone-800"}`} />
                    </div>
                    <div>
                      <label className="block uppercase text-stone-500 mb-1">Maximum (€) *</label>
                      <input type="number" min="1" step="1" required value={customGiftCardMaxAmount} onChange={(e) => setCustomGiftCardMaxAmount(e.target.value)} className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300" : "bg-black border-stone-800"}`} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block uppercase text-stone-500 mb-1">Description</label>
                  <textarea rows={2} value={customGiftCardDescription} onChange={(e) => setCustomGiftCardDescription(e.target.value)} className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300" : "bg-black border-stone-800"}`} />
                </div>
                <button type="submit" disabled={isSubmittingCustomGiftCard} className="bg-[#C4A77D] text-black px-6 py-3 text-xs tracking-[0.3em] uppercase font-medium disabled:opacity-50">
                  {isSubmittingCustomGiftCard ? "Création..." : "Publier la carte cadeau personnalisable"}
                </button>
              </form>
            </div>

            <div className={`p-8 border space-y-6 ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
              <div className="flex justify-between items-center">
                <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] flex items-center gap-2">
                  <Euro className="w-5 h-5" /> Créer une Carte Cadeau
                </h2>
                <button
                  type="button"
                  onClick={() => setGcCode(generateRandomCode("GIFT"))}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-widest bg-[#C4A77D]/10 border border-[#C4A77D]/40 text-[#C4A77D] px-3 py-1.5 hover:bg-[#C4A77D] hover:text-black transition-colors"
                >
                  <Wand2 className="w-3 h-3" /> Générer un code auto
                </button>
              </div>

              <form onSubmit={handleAddGiftCard} className="space-y-4 text-xs tracking-wider">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Code Unique *</label>
                    <input 
                      type="text" required value={gcCode} onChange={(e) => setGcCode(e.target.value)}
                      placeholder="Ex: GIFT-XYZ123"
                      className={`w-full p-3 border text-sm uppercase ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Montant initial (€) *</label>
                    <input 
                      type="number" step="0.01" required value={gcAmount} onChange={(e) => setGcAmount(e.target.value)}
                      placeholder="Ex: 50"
                      className={`w-full p-3 border text-sm ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="bg-[#C4A77D] text-black px-6 py-3 text-xs tracking-[0.3em] uppercase hover:bg-[#b3956c] transition-colors font-medium"
                >
                  Créer la Carte Cadeau
                </button>
              </form>
            </div>

            <div className={`p-8 border ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
              <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] mb-6 flex items-center gap-2">
                <Euro className="w-5 h-5" /> Suivi des Cartes Cadeaux ({giftCards.length})
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs tracking-wider">
                  <thead>
                    <tr className={`border-b uppercase tracking-widest text-stone-500 ${isDayMode ? "border-stone-200" : "border-stone-900"}`}>
                      <th className="pb-3 font-light">Code</th>
                      <th className="pb-3 font-light">Montant Initial</th>
                      <th className="pb-3 font-light">Solde Restant</th>
                      <th className="pb-3 font-light">Utilisée ?</th>
                      <th className="pb-3 font-light">Statut</th>
                      <th className="pb-3 font-light text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-900/50">
                    {giftCards.length === 0 ? (
                      <tr><td colSpan={6} className="py-6 text-center text-stone-500 italic">Aucune carte cadeau configurée.</td></tr>
                    ) : (
                      giftCards.map((gc) => {
                        const isUsed = gc.remainingBalance < gc.initialAmount;
                        const isDepleted = gc.remainingBalance <= 0;

                        return (
                          <tr key={gc.id} className="hover:bg-stone-900/10 transition-colors">
                            <td className="py-4 font-mono font-bold text-sm text-[#C4A77D] uppercase">{gc.code}</td>
                            <td className="py-4 text-stone-400">{gc.initialAmount} €</td>
                            <td className="py-4 font-medium text-green-400">{gc.remainingBalance?.toFixed(2)} €</td>
                            <td className="py-4 text-stone-300">
                              {isUsed ? (
                                <span className="text-amber-400 font-medium">Oui</span>
                              ) : (
                                <span className="text-stone-500">Non</span>
                              )}
                            </td>
                            <td className="py-4">
                              <span className={`px-2 py-1 text-[10px] uppercase ${!isDepleted && gc.isActive !== false ? "bg-green-500/15 text-green-400 border border-green-500/30" : "bg-red-500/15 text-red-400 border border-red-500/30"}`}>
                                {!isDepleted && gc.isActive !== false ? "Active" : "Épuisée"}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <button
                                type="button"
                                onClick={() => void handleDeleteGiftCard(gc)}
                                className="p-2 text-red-400 transition-colors hover:text-red-300"
                                title="Supprimer cette carte cadeau"
                                aria-label={`Supprimer la carte ${gc.code}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET UTILISATEURS */}
        {activeTab === "users" && (
          <div className={`p-8 border ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
            <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Inscrits sur la plateforme ({users.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tracking-wider">
                <thead>
                  <tr className={`border-b uppercase tracking-widest text-stone-500 ${isDayMode ? "border-stone-200" : "border-stone-900"}`}>
                    <th className="pb-3 font-light">Nom / Prénom</th>
                    <th className="pb-3 font-light">E-mail</th>
                    <th className="pb-3 font-light">Adresse</th>
                    <th className="pb-3 font-light text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-900/50">
                  {users.length === 0 ? (
                    <tr><td colSpan={4} className="py-6 text-center text-stone-500 italic">Aucun client inscrit dans Firestore.</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-stone-900/10 transition-colors">
                        <td className="py-4 font-serif text-sm">{u.firstName} {u.lastName}</td>
                        <td className="py-4 text-stone-400">{u.email}</td>
                        <td className="py-4 text-stone-400">
                          {u.addressDetails ? `${u.addressDetails.street}, ${u.addressDetails.postalCode} ${u.addressDetails.city}` : u.address || "Aucune adresse"}
                        </td>
                        <td className="py-4 text-right">
                          <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-300 p-2">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODALE SUR-MESURE D'EXPÉDITION ET SUIVI */}
        {shippingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`p-8 border max-w-md w-full space-y-6 ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-stone-950 border-stone-900 text-stone-100"}`}>
              <div className="flex justify-between items-center border-b pb-4 border-stone-800">
                <h3 className="font-serif text-base tracking-[0.2em] text-[#C4A77D] flex items-center gap-2">
                  <Truck className="w-5 h-5" /> Expédier la commande
                </h3>
                <button onClick={() => setShippingOrder(null)} className="text-stone-400 hover:text-stone-200"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleConfirmShipping} className="space-y-4 text-xs">
                <div>
                  <span className="text-stone-500 uppercase block mb-1">Commande</span>
                  <p className="font-serif text-sm text-[#C4A77D]">{shippingOrder.id} - {shippingOrder.clientName}</p>
                </div>

                <div>
                  <label className="block uppercase text-stone-500 mb-1">Choix du Transporteur</label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className={`w-full p-3 border text-sm ${isDayMode ? "bg-stone-50 border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                  >
                    <option value="Colissimo">Colissimo (La Poste)</option>
                    <option value="Mondial Relay">Mondial Relay</option>
                    <option value="Chronopost">Chronopost</option>
                    <option value="Autre">Autre transporteur</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase text-stone-500 mb-1">Numéro de Suivi de Colis</label>
                  <input 
                    type="text" 
                    required 
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Ex: 8P0012345678"
                    className={`w-full p-3 border text-sm ${isDayMode ? "bg-stone-50 border-stone-300 text-stone-900" : "bg-black border-stone-800 text-stone-100"}`}
                  />
                </div>

                {editingArticle.isCustomGiftCard && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block uppercase text-stone-500 mb-1">Montant minimum (€)</label>
                      <input
                        type="number"
                        min="1"
                        value={editingArticle.giftCardConfig?.minAmount || 10}
                        onChange={(e) => setEditingArticle({
                          ...editingArticle,
                          giftCardConfig: { ...(editingArticle.giftCardConfig || {}), minAmount: e.target.value },
                        })}
                        className={`w-full p-3 border ${isDayMode ? "bg-stone-50 border-stone-300" : "bg-black border-stone-800"}`}
                      />
                    </div>
                    <div>
                      <label className="block uppercase text-stone-500 mb-1">Montant maximum (€)</label>
                      <input
                        type="number"
                        min="1"
                        value={editingArticle.giftCardConfig?.maxAmount || 500}
                        onChange={(e) => setEditingArticle({
                          ...editingArticle,
                          giftCardConfig: { ...(editingArticle.giftCardConfig || {}), maxAmount: e.target.value },
                        })}
                        className={`w-full p-3 border ${isDayMode ? "bg-stone-50 border-stone-300" : "bg-black border-stone-800"}`}
                      />
                    </div>
                  </div>
                )}

                {(editingArticle.isAdvent || editingArticle.category === "calendrier-avent") && (
                  <div>
                    <label className="block uppercase text-stone-500 mb-2">Catégories proposées dans ce calendrier</label>
                    <div className="grid grid-cols-2 gap-3">
                      {adventCategoryAvailability.map(({ category, availableStock, isAvailable }) => {
                        const selectedCategories = editingArticle.adventConfig?.categories || [];
                        const isSelected = selectedCategories.includes(category) && isAvailable;

                        return (
                          <label
                            key={category}
                            className={`flex items-center justify-between p-3 border ${
                              isSelected
                                ? "border-[#C4A77D] bg-[#C4A77D]/10 text-[#C4A77D]"
                                : isAvailable
                                  ? isDayMode ? "border-stone-300" : "border-stone-800"
                                  : "border-red-500/30 text-red-400/70 cursor-not-allowed"
                            }`}
                          >
                            <span>
                              <span className="block uppercase">{category}</span>
                              <span className="block mt-1 text-[9px] normal-case">
                                {isAvailable ? `${availableStock} en stock` : "Indisponible"}
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isAvailable}
                              onChange={() => {
                                const nextCategories = isSelected
                                  ? selectedCategories.filter((item: string) => item !== category)
                                  : [...selectedCategories, category];
                                setEditingArticle({
                                  ...editingArticle,
                                  adventConfig: { ...(editingArticle.adventConfig || {}), categories: nextCategories },
                                });
                              }}
                              className="w-4 h-4 accent-[#C4A77D]"
                            />
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[10px] text-stone-500">
                      Une catégorie sans stock est automatiquement retirée lors de l'enregistrement.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-stone-800">
                  <button 
                    type="button" 
                    onClick={() => setShippingOrder(null)} 
                    className="px-4 py-2 uppercase border border-stone-700 hover:bg-stone-900"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 uppercase bg-[#C4A77D] text-black font-medium hover:bg-[#b3956c] transition-colors"
                  >
                    Valider l'expédition
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODALE D'ÉDITION D'UN ARTICLE */}
        {editingArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className={`p-8 border max-w-2xl w-full space-y-6 ${isDayMode ? "bg-white border-stone-300 text-stone-900" : "bg-stone-950 border-stone-900 text-stone-100"}`}>
              <div className="flex justify-between items-center border-b pb-4 border-stone-800">
                <h3 className="font-serif text-lg tracking-[0.2em] text-[#C4A77D]">Modifier l'article : {editingArticle.ref}</h3>
                <button onClick={() => setEditingArticle(null)} className="text-stone-400 hover:text-stone-200"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveEditedArticle} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Titre</label>
                    <input 
                      type="text" required value={editingArticle.title}
                      onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                      className={`w-full p-3 border ${isDayMode ? "bg-stone-50 border-stone-300" : "bg-black border-stone-800"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Catégorie</label>
                    <select required value={editingArticle.category}
                      onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                      className={`w-full p-3 border ${isDayMode ? "bg-stone-50 border-stone-300" : "bg-black border-stone-800"}`}
                    >
                      {!catalogTaxonomy.categories.some(item => item.id === editingArticle.category) && (
                        <option value={editingArticle.category}>{editingArticle.category} (valeur actuelle)</option>
                      )}
                      {catalogTaxonomy.categories.map(item => <option key={item.id} value={item.id}>{item.label}{item.isVisible ? "" : " (masquée)"}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {([
                    { key: "subcategory", label: "Sous-catégorie", items: catalogTaxonomy.subcategories },
                    { key: "theme", label: "Thème", items: catalogTaxonomy.themes },
                    { key: "color", label: "Couleur", items: catalogTaxonomy.colors },
                  ]).map(field => (
                    <div key={field.key}>
                      <label className="block uppercase text-stone-500 mb-1">{field.label}</label>
                      <select value={editingArticle[field.key] || ""} onChange={(e) => setEditingArticle({ ...editingArticle, [field.key]: e.target.value })} className={`w-full p-3 border ${isDayMode ? "bg-stone-50 border-stone-300" : "bg-black border-stone-800"}`}>
                        <option value="">Aucun(e)</option>
                        {field.items.map(item => <option key={item.id} value={item.id}>{item.label}{item.isVisible ? "" : " (masqué)"}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Prix (€)</label>
                    <input 
                      type="number" step="0.01" required value={editingArticle.price}
                      onChange={(e) => setEditingArticle({ ...editingArticle, price: e.target.value })}
                      className={`w-full p-3 border ${isDayMode ? "bg-stone-50 border-stone-300" : "bg-black border-stone-800"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Réduction (%)</label>
                    <input 
                      type="number" min="0" max="100" value={editingArticle.reduction || 0}
                      onChange={(e) => setEditingArticle({ ...editingArticle, reduction: e.target.value })}
                      className={`w-full p-3 border ${isDayMode ? "bg-stone-50 border-stone-300" : "bg-black border-stone-800"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Stock</label>
                    <input 
                      type="number" value={editingArticle.quantity || 0}
                      onChange={(e) => setEditingArticle({ ...editingArticle, quantity: e.target.value })}
                      className={`w-full p-3 border ${isDayMode ? "bg-stone-50 border-stone-300" : "bg-black border-stone-800"}`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-stone-500 mb-1">Poids (g)</label>
                    <input type="number" min="0" step="1" value={editingArticle.weight || 0}
                      onChange={(e) => setEditingArticle({ ...editingArticle, weight: e.target.value })}
                      className={`w-full p-3 border ${isDayMode ? "bg-stone-50 border-stone-300" : "bg-black border-stone-800"}`} />
                  </div>
                </div>

                <div>
                  <label className="block uppercase text-stone-500 mb-1">Ajouter d'autres photos</label>
                  <input 
                    type="file" accept="image/*" multiple onChange={(e) => setEditImageFiles(e.target.files)}
                    className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-[#C4A77D] file:text-black"
                  />
                  {editingArticle.imageUrls && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {editingArticle.imageUrls.map((img: string, idx: number) => (
                        <img key={idx} src={img} alt="preview" className="w-12 h-12 object-cover border border-stone-700" />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block uppercase text-stone-500 mb-1">Description</label>
                  <textarea 
                    rows={3} value={editingArticle.description || ""}
                    onChange={(e) => setEditingArticle({ ...editingArticle, description: e.target.value })}
                    className={`w-full p-3 border ${isDayMode ? "bg-stone-50 border-stone-300" : "bg-black border-stone-800"}`}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-stone-800">
                  <button type="button" onClick={() => setEditingArticle(null)} className="px-4 py-2 uppercase border border-stone-700">Annuler</button>
                  <button type="submit" className="px-6 py-2 uppercase bg-[#C4A77D] text-black font-medium">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODALE DÉTAILS COMMANDE */}
        {selectedOrderDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className={`p-8 border max-w-lg w-full space-y-6 ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
              <div className="flex justify-between items-center border-b pb-4 border-stone-800">
                <h3 className="font-serif text-lg tracking-[0.2em] text-[#C4A77D]">Détails commande</h3>
                <button onClick={() => setSelectedOrderDetails(null)} className="text-stone-400 hover:text-stone-200 text-sm uppercase">Fermer</button>
              </div>

              <div className="space-y-4 text-xs tracking-wider">
                <div className={`p-4 border ${isDayMode ? "border-stone-200 bg-white" : "border-stone-900 bg-black"}`}>
                  <span className="text-stone-500 uppercase block mb-1">Client</span>
                  <p className="font-serif text-sm">{selectedOrderDetails.clientName || selectedOrderDetails.clientEmail}</p>
                  <p className="text-stone-400">{selectedOrderDetails.clientEmail}</p>
                  <p className="mt-2 text-stone-400">
                    <strong>Adresse :</strong> {selectedOrderDetails.address?.street || selectedOrderDetails.address || "N/A"}, {selectedOrderDetails.address?.postalCode || ""} {selectedOrderDetails.address?.city || ""}
                  </p>
                  {selectedOrderDetails.carrier && selectedOrderDetails.trackingNumber && (
                    <p className="mt-2 text-[#C4A77D]">
                      <strong>Suivi :</strong> {selectedOrderDetails.carrier} - {selectedOrderDetails.trackingNumber}
                    </p>
                  )}
                  {selectedOrderDetails.shipping?.methodName && (
                    <p className="mt-2 text-[#C4A77D]"><strong>Livraison :</strong> {selectedOrderDetails.shipping.methodName} — {selectedOrderDetails.shipping.servicePointId ? "Point relais" : "Domicile"}</p>
                  )}
                  {selectedOrderDetails.giftPackaging?.enabled && <p className="mt-2 text-amber-300"><strong>Emballage cadeau + carte :</strong> 1,00 € — Message : {selectedOrderDetails.giftPackaging.message || "(aucun message)"}</p>}
                  {selectedOrderDetails.surpriseGift?.included && <p className="mt-2 text-green-400"><strong>🎁 Cadeau surprise privilège à ajouter au colis</strong> — offert dès {selectedOrderDetails.surpriseGift.threshold} € hors livraison.</p>}
                  {selectedOrderDetails.shipping?.servicePoint && <p className="text-stone-400"><strong>Relais :</strong> {selectedOrderDetails.shipping.servicePoint.name}, {selectedOrderDetails.shipping.servicePoint.street} {selectedOrderDetails.shipping.servicePoint.house_number || ""}, {selectedOrderDetails.shipping.servicePoint.postal_code} {selectedOrderDetails.shipping.servicePoint.city}</p>}
                </div>

                <div className={`p-4 border ${isDayMode ? "border-stone-200 bg-white" : "border-stone-900 bg-black"}`}>
                  <span className="text-stone-500 uppercase block mb-2">Articles commandés</span>
                  <ul className="space-y-2">
                    {(selectedOrderDetails.items || selectedOrderDetails.cartItems || []).map((item: any, i: number) => (
                      <li key={i} className="border-b border-stone-800 pb-2 last:border-0">
                        <div className="flex justify-between">
                          <span>{item.name || item.title || 'Article'} (x{item.quantity || 1})</span>
                          <span className="font-light">{typeof item.price === 'string' ? item.price : ((item.price || 0) * (item.quantity || 1)).toFixed(2) + ' €'}</span>
                        </div>
                        {item.options?.giftCard && (
                          <div className={`mt-2 p-3 text-[10px] ${item.options.deliveryType === "physical" ? "border border-amber-500/40 bg-amber-500/10 text-amber-300" : "border border-blue-500/30 bg-blue-500/10 text-blue-300"}`}>
                            <strong className="block mb-1 uppercase">
                              {item.options.deliveryType === "physical" ? "À préparer et expédier par courrier" : "Carte virtuelle envoyée par e-mail"}
                            </strong>
                            <p>Destinataire : {item.options.recipientName}</p>
                            {item.options.recipientEmail && <p>E-mail : {item.options.recipientEmail}</p>}
                            {item.options.deliveryType === "physical" && item.options.shippingAddress && (
                              <p>
                                Adresse : {item.options.shippingAddress.street}{item.options.shippingAddress.complement ? `, ${item.options.shippingAddress.complement}` : ""}, {item.options.shippingAddress.postalCode} {item.options.shippingAddress.city}, {item.options.shippingAddress.country}
                              </p>
                            )}
                            <p>Offert par : {item.options.senderName}</p>
                            {item.options.message && <p>Message à imprimer : {item.options.message}</p>}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  {selectedOrderDetails.giftCardsCreated?.some((card: any) => card.deliveryType === "physical") && (
                    <div className="mt-3 border border-amber-500/40 bg-amber-500/10 p-3 text-[10px] text-amber-300">
                      <strong className="block mb-2 uppercase">Codes à inscrire sur les cartes physiques</strong>
                      {selectedOrderDetails.giftCardsCreated
                        .filter((card: any) => card.deliveryType === "physical")
                        .map((card: any) => (
                          <p key={card.code} className="font-mono">{card.recipientName} — {card.code} — {card.amount} €</p>
                        ))}
                    </div>
                  )}
                  <div className="border-t border-stone-800 mt-3 pt-3 flex justify-between font-serif text-sm text-[#C4A77D]">
                    <span>Total</span>
                    <span>{typeof selectedOrderDetails.total === 'number' ? selectedOrderDetails.total.toFixed(2) + ' €' : selectedOrderDetails.total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default AdminPage;

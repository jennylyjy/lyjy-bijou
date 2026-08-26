"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useThemeStore } from "@/store/useThemeStore";
import { useCartStore } from "@/store/useCartStore";
import { db } from "@/lib/firebase";

interface CouponData {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minimumAmount?: number | string;
  isActive?: boolean;
  expirationDate?: string | null;
  maxUses?: number | null;
  currentUses?: number;
  usedBy?: string[];
}

interface GiftCardData {
  id: string;
  code: string;
  remainingBalance: number;
  initialAmount?: number;
  isActive?: boolean;
}

interface StoredAddress {
  street?: string;
  complement?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

interface StoredUser {
  email?: string;
  firstName?: string;
  lastName?: string;
  addressDetails?: StoredAddress;
}

interface GeneratedGiftCard {
  code: string;
  amount: number;
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  message: string;
  deliveryType: "virtual" | "physical";
  shippingAddress?: StoredAddress;
}

interface ApiErrorResponse {
  error?: string;
}

interface ShippingMethod { id: number; name: string; carrier?: { name?: string } | string; min_weight?: string; max_weight?: string; countries?: Array<{ iso_2: string; price: number }> }
interface ServicePoint { id: number; name: string; street: string; house_number?: string; postal_code: string; city: string; carrier?: string; }

const removeUndefined = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .filter(item => item !== undefined)
      .map(item => removeUndefined(item)) as T;
  }

  if (
    typeof value === "object"
    && value !== null
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [
          key,
          removeUndefined(item),
        ]),
    ) as T;
  }

  return value;
};

const getErrorMessage = (
  error: unknown,
): string => {
  return error instanceof Error
    ? error.message
    : "Erreur inconnue";
};

const isApiErrorResponse = (
  value: unknown,
): value is ApiErrorResponse => {
  return (
    typeof value === "object"
    && value !== null
    && (
      !("error" in value)
      || typeof value.error === "string"
    )
  );
};

const getStoredUser = (): StoredUser | null => {
  const value = localStorage.getItem(
    "lyjy_current_user",
  );

  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (
      typeof parsed !== "object"
      || parsed === null
    ) {
      return null;
    }

    return parsed as StoredUser;
  } catch {
    return null;
  }
};

const generateOrderId = (): string => {
  const randomValues =
    new Uint32Array(1);

  crypto.getRandomValues(
    randomValues,
  );

  const number =
    1000
    + (
      randomValues[0]
      % 9000
    );

  return `CMD-${number}`;
};

const generateGiftCardCode = (): string => {
  return `GIFT-${crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase()}`;
};

const CartPage = () => {
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [shippingMethodId, setShippingMethodId] = useState("");
  const [shippingPrice, setShippingPrice] = useState(0);
  const [giftPackaging, setGiftPackaging] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [postalCode, setPostalCode] = useState("");
  const [servicePoints, setServicePoints] = useState<ServicePoint[]>([]);
  const [selectedServicePoint, setSelectedServicePoint] = useState("");
  const [searchingPoints, setSearchingPoints] = useState(false);
  const searchServicePoints = async () => {
    if (!/^\d{5}$/.test(postalCode)) return;
    setSearchingPoints(true);
    try { const response = await fetch(`/api/sendcloud/service-points?postal_code=${postalCode}&country=FR`); const data = await response.json(); setServicePoints(Array.isArray(data) ? data : []); }
    finally { setSearchingPoints(false); }
  };
  const {
    isDayMode,
    toggleDayMode,
  } = useThemeStore();

  const router = useRouter();

  const items = useCartStore(
    state => state.items,
  );

  const totalWeight = useMemo(() => Math.max(100, items.reduce((sum, item) => sum + (Number((item as typeof item & { weight?: number }).weight) || 0) * item.quantity, 0)), [items]);
  const simplifiedShippingMethods = useMemo(() => {
    const selected = new Map<string, ShippingMethod>();
    shippingMethods.forEach(method => {
      if (method.min_weight && totalWeight < Number(method.min_weight) * 1000) return;
      if (method.max_weight && totalWeight > Number(method.max_weight) * 1000) return;
      const frenchPrice = method.countries?.find(country => country.iso_2 === "FR")?.price;
      if (frenchPrice == null || frenchPrice <= 0) return;
      const carrierName = typeof method.carrier === "string" ? method.carrier : method.carrier?.name || "";
      const label = `${method.name} ${carrierName}`.toLowerCase();
      const isRelay = /relay|relais|pickup|point/.test(label);
      const key = /mondial/.test(label) ? "mondial" : /colissimo|la poste|laposte/.test(label) ? (isRelay ? "colissimo-relay" : "colissimo-home") : "";
      if (key && !selected.has(key)) selected.set(key, method);
    });
    return [...selected.entries()].map(([key, method]) => ({ ...method, displayName: key === "mondial" ? "Mondial Relay — Point relais" : key === "colissimo-relay" ? "Colissimo — Point relais" : "Colissimo — Livraison à domicile" }));
  }, [shippingMethods, totalWeight]);
  const selectedShippingMethod = simplifiedShippingMethods.find(method => String(method.id) === shippingMethodId);
  const needsServicePoint = Boolean(selectedShippingMethod && (/relais|relay|pickup|point/i.test(selectedShippingMethod.displayName) || (selectedShippingMethod as ShippingMethod & { service_point_input?: string }).service_point_input === "required"));
  useEffect(() => {
    fetch("/api/sendcloud/shipping-methods").then(response => response.ok ? response.json() : []).then(data => setShippingMethods(Array.isArray(data) ? data : data.shipping_methods || data.methods || [])).catch(() => setShippingMethods([]));
  }, []);
  useEffect(() => { if (!shippingMethodId && simplifiedShippingMethods[0]) setShippingMethodId(String(simplifiedShippingMethods[0].id)); }, [shippingMethodId, simplifiedShippingMethods]);
  useEffect(() => {
    if (!shippingMethodId) return setShippingPrice(0);
    const method = shippingMethods.find(item => String(item.id) === shippingMethodId);
    const configured = method?.countries?.find(country => country.iso_2 === "FR")?.price;
    if (configured != null && configured > 0) return setShippingPrice(configured);
    fetch(`/api/sendcloud/shipping-price?shipping_method_id=${shippingMethodId}&weight=${totalWeight}&to_country=FR`).then(response => response.ok ? response.json() : []).then(data => { const prices = Array.isArray(data) ? data : data.shipping_price || data.prices || [data]; setShippingPrice(Number(prices[0]?.price) || 0); }).catch(() => setShippingPrice(0));
  }, [shippingMethodId, totalWeight, shippingMethods]);

  const removeItem = useCartStore(
    state => state.removeItem,
  );
  const updateQuantity = useCartStore(state => state.updateQuantity);

  const clearCart = useCartStore(
    state => state.clearCart,
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    inputCouponCode,
    setInputCouponCode,
  ] = useState("");

  const [
    appliedCoupon,
    setAppliedCoupon,
  ] = useState<CouponData | null>(null);

  const [
    inputGiftCode,
    setInputGiftCode,
  ] = useState("");

  const [
    appliedGiftCards,
    setAppliedGiftCards,
  ] = useState<GiftCardData[]>([]);

  const subtotal = items.reduce(
    (
      sum,
      item,
    ) => (
      sum
      + item.price * item.quantity
    ),
    0,
  );

  const handleApplyCoupon = async (
    event: React.FormEvent,
  ): Promise<void> => {
    event.preventDefault();

    setErrorMessage("");

    if (!inputCouponCode.trim()) {
      return;
    }

    try {
      const normalizedCode =
        inputCouponCode
          .toUpperCase()
          .trim();

      const couponQuery = query(
        collection(
          db,
          "coupons",
        ),
        where(
          "code",
          "==",
          normalizedCode,
        ),
      );

      const snapshot =
        await getDocs(
          couponQuery,
        );

      if (snapshot.empty) {
        setErrorMessage(
          "Ce code promo n'existe pas.",
        );

        return;
      }

      const couponDocument =
        snapshot.docs[0];

      const data =
        couponDocument.data();

      const discountType =
        data.discountType
          === "fixed"
          ? "fixed"
          : "percent";

      const couponData: CouponData = {
        id:
          couponDocument.id,

        code:
          String(
            data.code
            ?? normalizedCode,
          ),

        discountType,

        discountValue:
          Number(
            data.discountValue,
          ) || 0,

        minimumAmount:
          typeof data.minimumAmount
            === "number"
            || typeof data.minimumAmount
              === "string"
            ? data.minimumAmount
            : 0,

        isActive:
          data.isActive !== false,

        expirationDate:
          typeof data.expirationDate
            === "string"
            ? data.expirationDate
            : null,

        maxUses:
          typeof data.maxUses
            === "number"
            ? data.maxUses
            : null,

        currentUses:
          typeof data.currentUses
            === "number"
            ? data.currentUses
            : 0,

        usedBy:
          Array.isArray(
            data.usedBy,
          )
            ? data.usedBy.filter(
                (
                  value,
                ): value is string => (
                  typeof value
                  === "string"
                ),
              )
            : [],
      };

      if (!couponData.isActive) {
        setErrorMessage(
          "Ce code promo n'est plus actif.",
        );

        return;
      }

      if (
        couponData.expirationDate
        && new Date(
          couponData.expirationDate,
        ) < new Date()
      ) {
        setErrorMessage(
          "Ce code promo a expiré.",
        );

        return;
      }

      if (
        couponData.maxUses
        && (
          couponData.currentUses
          ?? 0
        ) >= couponData.maxUses
      ) {
        setErrorMessage(
          "Ce code promo a atteint son nombre maximum d'utilisations.",
        );

        return;
      }

      const minimumAmount =
        Number(
          couponData.minimumAmount,
        ) || 0;

      if (
        subtotal
        < minimumAmount
      ) {
        setErrorMessage(
          `Ce code est valable à partir de ${minimumAmount.toFixed(2)} € d'achat.`,
        );

        return;
      }

      const currentUser =
        getStoredUser();

      const userEmail =
        currentUser?.email
        ?? "test@lyjy.fr";

      if (
        couponData.usedBy
        ?.includes(
          userEmail,
        )
      ) {
        setErrorMessage(
          "Vous avez déjà utilisé ce code promo.",
        );

        return;
      }

      setAppliedCoupon(
        couponData,
      );

      setInputCouponCode("");

      setSuccessMessage(
        "Code promo appliqué avec succès !",
      );

      window.setTimeout(
        () => {
          setSuccessMessage("");
        },
        3000,
      );
    } catch (
      error: unknown
    ) {
      setErrorMessage(
        `Erreur lors de l'application du code : ${getErrorMessage(error)}`,
      );
    }
  };

  const handleApplyGiftCard = async (
    event: React.FormEvent,
  ): Promise<void> => {
    event.preventDefault();

    setErrorMessage("");

    if (!inputGiftCode.trim()) {
      return;
    }

    const codeToSearch =
      inputGiftCode
        .toUpperCase()
        .trim();

    if (
      appliedGiftCards.some(
        giftCard =>
          giftCard.code
          === codeToSearch,
      )
    ) {
      setErrorMessage(
        "Cette carte cadeau est déjà appliquée dans votre panier.",
      );

      return;
    }

    try {
      const giftCardQuery = query(
        collection(
          db,
          "giftCards",
        ),
        where(
          "code",
          "==",
          codeToSearch,
        ),
      );

      const snapshot =
        await getDocs(
          giftCardQuery,
        );

      if (snapshot.empty) {
        setErrorMessage(
          "Cette carte cadeau n'existe pas.",
        );

        return;
      }

      const giftCardDocument =
        snapshot.docs[0];

      const data =
        giftCardDocument.data();

      const giftCardData: GiftCardData = {
        id:
          giftCardDocument.id,

        code:
          String(
            data.code
            ?? codeToSearch,
          ),

        remainingBalance:
          Number(
            data.remainingBalance,
          ) || 0,

        initialAmount:
          typeof data.initialAmount
            === "number"
            ? data.initialAmount
            : undefined,

        isActive:
          data.isActive !== false,
      };

      if (
        giftCardData.isActive === false
        || giftCardData.remainingBalance <= 0
      ) {
        setErrorMessage(
          "Cette carte cadeau est épuisée ou inactive.",
        );

        return;
      }

      setAppliedGiftCards(
        previousGiftCards => [
          ...previousGiftCards,
          giftCardData,
        ],
      );

      setInputGiftCode("");

      setSuccessMessage(
        "Carte cadeau ajoutée !",
      );

      window.setTimeout(
        () => {
          setSuccessMessage("");
        },
        3000,
      );
    } catch (
      error: unknown
    ) {
      setErrorMessage(
        `Erreur carte cadeau : ${getErrorMessage(error)}`,
      );
    }
  };

  const removeAppliedCoupon = (): void => {
    setAppliedCoupon(null);
  };

  const removeAppliedGiftCard = (
    id: string,
  ): void => {
    setAppliedGiftCards(
      previousGiftCards =>
        previousGiftCards.filter(
          giftCard =>
            giftCard.id !== id,
        ),
    );
  };

  const couponMeetsMinimum =
    appliedCoupon
      ? (
          subtotal
          >= (
            Number(
              appliedCoupon.minimumAmount,
            )
            || 0
          )
        )
      : false;

  let discountAmount = 0;

  if (
    appliedCoupon
    && couponMeetsMinimum
  ) {
    if (
      appliedCoupon.discountType
      === "percent"
    ) {
      discountAmount =
        (
          subtotal
          * appliedCoupon.discountValue
        ) / 100;
    } else {
      discountAmount =
        appliedCoupon.discountValue;
    }
  }

  discountAmount =
    Math.min(
      Math.max(
        discountAmount,
        0,
      ),
      subtotal,
    );

  const subtotalAfterPromo =
    Math.max(
      0,
      subtotal
      - discountAmount,
    );

  const totalGiftBalance =
    appliedGiftCards.reduce(
      (
        sum,
        giftCard,
      ) => (
        sum
        + giftCard.remainingBalance
      ),
      0,
    );

  const giftCardAmountUsed =
    Math.min(
      subtotalAfterPromo,
      totalGiftBalance,
    );

  const finalTotal =
    Math.max(
      0,
      subtotalAfterPromo
      - totalGiftBalance,
    ) + shippingPrice + (giftPackaging ? 1 : 0);
  const surpriseGiftEligible = subtotalAfterPromo >= 200;

  const handleTestCheckout =
    async (): Promise<void> => {
      if (
        items.length === 0
        || isProcessing
      ) {
        return;
      }
      if (!acceptedTerms) { setErrorMessage("Veuillez accepter les CGV-CGU."); return; }
      if (!getStoredUser()) { router.push("/connexion?returnTo=/panier"); return; }
      const stripeResponse = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ name: "Commande LYJY Atelier", price: finalTotal, quantity: 1 }] }) });
      const stripeSession = await stripeResponse.json();
      if (!stripeResponse.ok || !stripeSession.url) throw new Error(stripeSession.error || "Paiement Stripe indisponible");
      window.location.assign(stripeSession.url);
      return;

      setIsProcessing(true);
      setErrorMessage("");

      try {
        const currentUser =
          getStoredUser();

        if (!currentUser) {
          router.push("/connexion?returnTo=/panier");
          return;
        }

        const userEmail =
          currentUser?.email
          ?? "test@lyjy.fr";

        const orderId =
          generateOrderId();

        const giftCardCodesList =
          appliedGiftCards.map(
            giftCard =>
              giftCard.code,
          );

        const generatedGiftCards:
          GeneratedGiftCard[] = [];

        const giftCardItems =
          items.filter(
            item =>
              item.options
                ?.giftCard
              === true,
          );

        for (
          const item
          of giftCardItems
        ) {
          for (
            let copy = 0;
            copy < item.quantity;
            copy += 1
          ) {
            const amount =
              Number(
                item.options?.amount,
              ) || item.price;

            const code =
              generateGiftCardCode();

            const deliveryType:
              "virtual" | "physical" =
              item.options
                ?.deliveryType
              === "physical"
                ? "physical"
                : "virtual";

            const shippingAddress =
              item.options
                ?.shippingAddress;

            await addDoc(
              collection(
                db,
                "giftCards",
              ),
              removeUndefined({
                code,

                initialAmount:
                  amount,

                remainingBalance:
                  amount,

                isActive:
                  true,

                source:
                  "custom-gift-card-order",

                orderId,

                recipientName:
                  String(
                    item.options
                      ?.recipientName
                    ?? "",
                  ),

                recipientEmail:
                  String(
                    item.options
                      ?.recipientEmail
                    ?? "",
                  ),

                senderName:
                  String(
                    item.options
                      ?.senderName
                    ?? "",
                  ),

                message:
                  String(
                    item.options
                      ?.message
                    ?? "",
                  ),

                deliveryType,

                shippingAddress:
                  deliveryType
                    === "physical"
                    && shippingAddress
                    ? shippingAddress
                    : null,

                fulfillmentStatus:
                  deliveryType
                    === "physical"
                    ? "to_prepare"
                    : "email_delivery",

                createdAt:
                  new Date()
                    .toISOString(),
              }),
            );

            const generatedGiftCard:
              GeneratedGiftCard = {
                code,
                amount,

                recipientEmail:
                  String(
                    item.options
                      ?.recipientEmail
                    ?? "",
                  ),

                recipientName:
                  String(
                    item.options
                      ?.recipientName
                    ?? "",
                  ),

                senderName:
                  String(
                    item.options
                      ?.senderName
                    ?? "",
                  ),

                message:
                  String(
                    item.options
                      ?.message
                    ?? "",
                  ),

                deliveryType,
              };

            if (
              deliveryType
                === "physical"
              && shippingAddress
            ) {
              generatedGiftCard.shippingAddress =
                removeUndefined({
                  street:
                    shippingAddress.street,

                  complement:
                    shippingAddress.complement,

                  postalCode:
                    shippingAddress.postalCode,

                  city:
                    shippingAddress.city,

                  country:
                    shippingAddress.country,
                });
            }

            generatedGiftCards.push(
              generatedGiftCard,
            );
          }
        }

        const orderData = {
          id:
            orderId,

          clientName:
            currentUser
              ? `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim()
                || "Client"
              : "Client Invité",

          clientEmail:
            userEmail,

          status:
            "preparing",

          total:
            finalTotal,

          shipping: {
            methodId: shippingMethodId || null,
            methodName: shippingMethods.find(method => String(method.id) === shippingMethodId)?.name || null,
            price: shippingPrice,
            weightGrams: totalWeight,
            servicePointId: selectedServicePoint || null,
            servicePoint: servicePoints.find(point => String(point.id) === selectedServicePoint) || null,
          },
          giftPackaging: giftPackaging ? { enabled: true, price: 1, message: giftMessage.trim() } : null,
          surpriseGift: surpriseGiftEligible ? { included: true, threshold: 200, shippingExcluded: true, label: "Cadeau surprise privilège" } : null,

          subtotal,

          discountApplied:
            discountAmount,

          giftCardAmount:
            giftCardAmountUsed,

          giftCardsUsed:
            giftCardCodesList,

          giftCardsCreated:
            generatedGiftCards,

          date:
            new Date()
              .toLocaleDateString(
                "fr-FR",
              ),

          createdAt:
            new Date()
              .toISOString(),

          items:
            items.map(
              item => ({
                id:
                  String(
                    item.id,
                  ),

                name:
                  item.name
                  || "Bijou LYJY",

                price:
                  item.price,

                quantity:
                  item.quantity,

                options:
                  item.options
                    ? removeUndefined(
                        item.options,
                      )
                    : null,
              }),
            ),

          address:
            currentUser
              ?.addressDetails
            ?? {
              street:
                "30 Trouhel",

              postalCode:
                "44460",

              city:
                "Fégréac",
            },
        };

        const cleanedOrderData =
          removeUndefined(
            orderData,
          );

        const orderRef =
          await addDoc(
            collection(
              db,
              "orders",
            ),
            cleanedOrderData,
          );

        localStorage.setItem(
          "lyjy_last_order",
          JSON.stringify(
            cleanedOrderData,
          ),
        );

        /*
         * Confirmation de commande.
         * Si Resend échoue,
         * la commande reste enregistrée.
         */
        try {
          const response =
            await fetch(
              "/api/send-email",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    type:
                      "ORDER_CONFIRMATION",

                    email:
                      userEmail,

                    orderDetails: {
                      id:
                        orderId,

                      clientName:
                        cleanedOrderData.clientName,

                      total:
                        finalTotal,

                      subtotal,

                      discountApplied:
                        discountAmount,

                      giftCardAmount:
                        giftCardAmountUsed,

                      items:
                        cleanedOrderData.items,

                      address:
                        cleanedOrderData.address,
                    },
                  }),
              },
            );

          const responseText =
            await response.text();

          if (!response.ok) {
            console.error(
              `Erreur confirmation commande | HTTP ${response.status} ${response.statusText} | ${responseText}`,
            );
          } else {
            console.log(
              `E-mail de confirmation envoyé avec succès pour la commande ${orderId}.`,
            );
          }
        } catch (
          error: unknown
        ) {
          console.error(
            `Impossible d'envoyer l'e-mail de confirmation | ${getErrorMessage(error)}`,
          );
        }

        /*
         * Envoi des cartes cadeaux virtuelles.
         */
        const virtualGiftCards =
          generatedGiftCards.filter(
            giftCard =>
              giftCard.deliveryType
              === "virtual",
          );

        const emailResults =
          await Promise.allSettled(
            virtualGiftCards.map(
              async giftCard => {
                if (
                  !giftCard
                    .recipientEmail
                    .trim()
                ) {
                  throw new Error(
                    `Adresse e-mail manquante pour la carte ${giftCard.code}.`,
                  );
                }

                const response =
                  await fetch(
                    "/api/send-email",
                    {
                      method:
                        "POST",

                      headers: {
                        "Content-Type":
                          "application/json",
                      },

                      body:
                        JSON.stringify({
                          type:
                            "GIFT_CARD_DELIVERY",

                          email:
                            giftCard.recipientEmail,

                          giftCard,
                        }),
                    },
                  );

                if (!response.ok) {
                  const result: unknown =
                    await response
                      .json()
                      .catch(
                        () => null,
                      );

                  let message =
                    "Échec de l'envoi de la carte cadeau";

                  if (
                    isApiErrorResponse(
                      result,
                    )
                    && result.error
                  ) {
                    message =
                      result.error;
                  }

                  throw new Error(
                    message,
                  );
                }
              },
            ),
          );

        const failedGiftCardEmails =
          emailResults.filter(
            result =>
              result.status
              === "rejected",
          ).length;

        if (
          generatedGiftCards.length
          > 0
        ) {
          await updateDoc(
            orderRef,
            {
              giftCardEmailStatus:
                failedGiftCardEmails
                  === 0
                  ? "sent"
                  : "failed",

              giftCardEmailFailures:
                failedGiftCardEmails,
            },
          );
        }

        /*
         * Décrément du stock des produits classiques.
         */
        for (
          const item
          of items
        ) {
          if (
            item.id
            && item.options
              ?.giftCard
              !== true
          ) {
            try {
              const articleRef =
                doc(
                  db,
                  "articles",
                  String(
                    item.id,
                  ),
                );

              await updateDoc(
                articleRef,
                {
                  quantity:
                    increment(
                      -item.quantity,
                    ),
                },
              );
            } catch (
              error: unknown
            ) {
              console.error(
                "Erreur stock article :",
                item.id,
                error,
              );
            }
          }
        }

        /*
         * Mise à jour du coupon utilisé.
         */
        if (
          appliedCoupon
          && couponMeetsMinimum
        ) {
          try {
            const couponRef =
              doc(
                db,
                "coupons",
                appliedCoupon?.id || "",
              );

            const currentUsedBy =
              appliedCoupon?.usedBy
              ?? [];

            await updateDoc(
              couponRef,
              {
                currentUses:
                  increment(1),

                usedBy: [
                  ...currentUsedBy,
                  userEmail,
                ],
              },
            );
          } catch (
            error: unknown
          ) {
            console.error(
              "Erreur code promo :",
              error,
            );
          }
        }

        /*
         * Débit des cartes cadeaux utilisées.
         */
        let currentPoolToDeduct =
          subtotalAfterPromo;

        for (
          const giftCard
          of appliedGiftCards
        ) {
          if (
            currentPoolToDeduct
            <= 0
          ) {
            break;
          }

          const balanceToUse =
            Math.min(
              giftCard.remainingBalance,
              currentPoolToDeduct,
            );

          const newBalance =
            giftCard.remainingBalance
            - balanceToUse;

          currentPoolToDeduct -=
            balanceToUse;

          try {
            const giftCardRef =
              doc(
                db,
                "giftCards",
                giftCard.id,
              );

            await updateDoc(
              giftCardRef,
              {
                remainingBalance:
                  newBalance,

                isActive:
                  newBalance > 0,
              },
            );
          } catch (
            error: unknown
          ) {
            console.error(
              "Erreur carte cadeau :",
              giftCard.id,
              error,
            );
          }
        }

        setSuccessMessage(
          failedGiftCardEmails > 0
            ? `Commande créée, mais ${failedGiftCardEmails} carte(s) cadeau(x) n'ont pas pu être envoyée(s). Vérifiez la configuration e-mail.`
            : "Paiement réussi ! Redirection...",
        );

        window.setTimeout(
          () => {
            clearCart();

            router.push(
              "/order-success",
            );
          },
          failedGiftCardEmails > 0
            ? 4000
            : 1000,
        );
      } catch (
        error: unknown
      ) {
        console.error(
          "Erreur Checkout :",
          error,
        );

        window.alert(
          `Erreur lors de l'enregistrement de la commande : ${getErrorMessage(error)}`,
        );

        setIsProcessing(false);
      }
    };

  return (
    <main
      className={`min-h-screen flex flex-col font-sans px-6 py-6 md:px-16 ${
        isDayMode
          ? "bg-[#F9F8F6] text-stone-900"
          : "bg-black text-stone-200"
      }`}
    >
      <header className="flex items-center justify-between border-b border-stone-800 pb-6 mb-10">
        <Link
          href="/boutique"
          className="text-xs uppercase tracking-widest text-stone-500 hover:text-[#C4A77D]"
        >
          ← Boutique
        </Link>

        <h1 className="text-lg font-serif tracking-[0.2em] text-[#C4A77D]">
          Votre Panier
        </h1>

        <button
          type="button"
          onClick={
            toggleDayMode
          }
          className="text-xs tracking-widest uppercase text-stone-400"
        >
          {isDayMode
            ? "Nuit"
            : "Jour"}
        </button>
      </header>

      {successMessage && (
        <div className="bg-green-500/15 border border-green-500/30 text-green-400 text-xs p-4 mb-6">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 text-xs p-4 mb-6">
          {errorMessage}
        </div>
      )}

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-6">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <ShoppingBag className="w-12 h-12 mx-auto text-stone-600" />

              <p className="text-xs tracking-widest uppercase text-stone-500">
                Votre panier est vide.
              </p>

              <Link
                href="/boutique"
                className="inline-block border border-[#C4A77D] text-[#C4A77D] px-6 py-3 text-xs uppercase"
              >
                Explorer
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-stone-800">
              {items.map(
                (
                  item,
                  index,
                ) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="py-4 flex justify-between items-start text-xs"
                  >
                    <div className="space-y-1">
                      <h3 className="font-serif text-sm text-[#C4A77D]">
                        {item.name}
                      </h3>

                      <p className="text-stone-500">
                        Quantité : {item.quantity}
                      </p>

                      {item.options && (
                        <div className="mt-2 text-[11px] space-y-0.5 border-l-2 border-[#C4A77D] pl-2 py-0.5 text-stone-400">
                          {item.options.formule && (
                            <p>
                              <span className="text-stone-500 uppercase">
                                Formule :
                              </span>{" "}

                              {item.options.formule}
                            </p>
                          )}

                          {item.options.finition && (
                            <p>
                              <span className="text-stone-500 uppercase">
                                Finition :
                              </span>{" "}

                              {item.options.finition}
                            </p>
                          )}

                          {item.options.categories
                            && item.options.categories.length > 0 && (
                            <p>
                              <span className="text-stone-500 uppercase">
                                Choix :
                              </span>{" "}

                              {item.options.categories.join(
                                ", ",
                              )}
                            </p>
                          )}

                          {item.options.giftCard && (
                            <>
                              <p>
                                <span className="text-stone-500 uppercase">
                                  Format :
                                </span>{" "}

                                {item.options.deliveryType
                                  === "physical"
                                  ? "Carte physique par courrier"
                                  : "Carte virtuelle par e-mail"}
                              </p>

                              <p>
                                <span className="text-stone-500 uppercase">
                                  Montant :
                                </span>{" "}

                                {item.options.amount} €
                              </p>

                              <p>
                                <span className="text-stone-500 uppercase">
                                  Pour :
                                </span>{" "}

                                {item.options.recipientName}

                                {item.options.recipientEmail
                                  ? ` (${item.options.recipientEmail})`
                                  : ""}
                              </p>

                              <p>
                                <span className="text-stone-500 uppercase">
                                  De :
                                </span>{" "}

                                {item.options.senderName}
                              </p>

                              {item.options.message && (
                                <p>
                                  <span className="text-stone-500 uppercase">
                                    Message :
                                  </span>{" "}

                                  {item.options.message}
                                </p>
                              )}

                              {item.options.deliveryType
                                === "physical"
                                && item.options.shippingAddress && (
                                <p>
                                  <span className="text-stone-500 uppercase">
                                    Expédition :
                                  </span>{" "}

                                  {item.options.shippingAddress.street}

                                  {item.options.shippingAddress.complement
                                    ? `, ${item.options.shippingAddress.complement}`
                                    : ""}

                                  ,{" "}

                                  {item.options.shippingAddress.postalCode}{" "}

                                  {item.options.shippingAddress.city}

                                  {item.options.shippingAddress.country
                                    ? `, ${item.options.shippingAddress.country}`
                                    : ""}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center border border-stone-700"><button type="button" onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1, item.options) : removeItem(item.id, item.options)} className="px-2 text-[#C4A77D]">−</button><span className="px-2">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1, item.options)} className="px-2 text-[#C4A77D]">+</button></div>
                      <span>
                        {(
                          item.price
                          * item.quantity
                        ).toFixed(2)} €
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeItem(
                            item.id,
                            item.options,
                          )
                        }
                        className="text-stone-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-6">
            <div className="p-6 border border-stone-800 space-y-4 text-xs">
              <h3 className="font-serif text-[#C4A77D] uppercase">
                Avantages
              </h3>

              {!appliedCoupon ? (
                <form
                  onSubmit={
                    handleApplyCoupon
                  }
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Code Promo"
                    value={
                      inputCouponCode
                    }
                    onChange={
                      event =>
                        setInputCouponCode(
                          event.target.value,
                        )
                    }
                    className="w-full p-2 border border-stone-700 bg-transparent uppercase"
                  />

                  <button
                    type="submit"
                    className="bg-[#C4A77D] text-black px-4 uppercase font-medium"
                  >
                    OK
                  </button>
                </form>
              ) : (
                <div
                  className={`flex justify-between items-center p-2 border ${
                    couponMeetsMinimum
                      ? "bg-[#C4A77D]/10 border-[#C4A77D]/30"
                      : "bg-red-500/10 border-red-500/30"
                  }`}
                >
                  <span
                    className={
                      couponMeetsMinimum
                        ? "text-[#C4A77D] font-mono"
                        : "text-red-400"
                    }
                  >
                    PROMO : {appliedCoupon.code}

                    {!couponMeetsMinimum
                      && ` — minimum ${(Number(appliedCoupon.minimumAmount) || 0).toFixed(2)} €`}
                  </span>

                  <button
                    type="button"
                    onClick={
                      removeAppliedCoupon
                    }
                    className="text-stone-400 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form
                onSubmit={
                  handleApplyGiftCard
                }
                className="flex gap-2 pt-2"
              >
                <input
                  type="text"
                  placeholder="Carte Cadeau"
                  value={
                    inputGiftCode
                  }
                  onChange={
                    event =>
                      setInputGiftCode(
                        event.target.value,
                      )
                  }
                  className="w-full p-2 border border-stone-700 bg-transparent uppercase"
                />

                <button
                  type="submit"
                  className="bg-stone-800 text-[#C4A77D] px-3 uppercase"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </form>

              {appliedGiftCards.map(
                giftCard => (
                  <div
                    key={giftCard.id}
                    className="flex justify-between items-center bg-stone-900 p-2 border border-stone-800"
                  >
                    <div>
                      <span className="font-mono text-green-400">
                        {giftCard.code}
                      </span>

                      <span className="block text-[10px] text-stone-400">
                        Solde : {giftCard.remainingBalance.toFixed(2)} €
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeAppliedGiftCard(
                          giftCard.id,
                        )
                      }
                      className="text-stone-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ),
              )}
            </div>

            <div className="p-6 border border-stone-800 space-y-4 text-xs">
              <h3 className="font-serif text-[#C4A77D] uppercase border-b border-stone-800 pb-2">
                Résumé
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>
                    Sous-total
                  </span>

                  <span>
                    {subtotal.toFixed(2)} €
                  </span>
                </div>

                {appliedCoupon
                  && couponMeetsMinimum && (
                  <div className="flex justify-between text-[#C4A77D]">
                    <span>
                      Réduction
                    </span>

                    <span>
                      -{discountAmount.toFixed(2)} €
                    </span>
                  </div>
                )}

                {appliedGiftCards.length > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>
                      Cartes cadeaux
                    </span>

                    <span>
                      -{giftCardAmountUsed.toFixed(2)} €
                    </span>
                  </div>
                )}

                {shippingMethods.length > 0 && <label className="block border-t border-stone-800 pt-3">Livraison ({totalWeight} g)
                  <select value={shippingMethodId} onChange={e => setShippingMethodId(e.target.value)} className="w-full mt-2 p-2 bg-black border border-stone-700">
                    <option value="">Choisir un transporteur</option>
                    {simplifiedShippingMethods.map(method => <option key={method.id} value={method.id}>{method.displayName}</option>)}
                  </select>
                </label>}
                {shippingPrice > 0 && <div className="flex justify-between"><span>Livraison</span><span>{shippingPrice.toFixed(2)} €</span></div>}
                <div className="border-t border-stone-800 pt-3 space-y-2"><label className="flex items-center gap-2"><input type="checkbox" checked={giftPackaging} onChange={e => setGiftPackaging(e.target.checked)} /> Emballage cadeau + carte (+1,00 €)</label>{giftPackaging && <textarea value={giftMessage} onChange={e => setGiftMessage(e.target.value.slice(0, 300))} placeholder="Message à écrire sur la carte" className="w-full p-2 bg-black border border-stone-700" />}</div>
                {giftPackaging && <div className="flex justify-between"><span>Emballage cadeau + carte</span><span>1,00 €</span></div>}
                {surpriseGiftEligible && <div className="border border-green-500/30 bg-green-500/10 p-2 text-green-400">🎁 Cadeau surprise privilège offert (commande de 200 € ou plus, hors livraison)</div>}
                {needsServicePoint && <div className="border-t border-stone-800 pt-3 space-y-2"><span className="block">Trouver un relais près de chez vous</span><div className="flex gap-2"><input value={postalCode} onChange={e => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="Code postal" className="w-full p-2 bg-black border border-stone-700" /><button type="button" onClick={searchServicePoints} disabled={searchingPoints} className="px-3 bg-[#C4A77D] text-black">{searchingPoints ? "..." : "Rechercher"}</button></div>{servicePoints.length > 0 && <select value={selectedServicePoint} onChange={e => setSelectedServicePoint(e.target.value)} className="w-full p-2 bg-black border border-stone-700"><option value="">Sélectionner un relais</option>{servicePoints.slice(0, 10).map(point => <option key={point.id} value={point.id}>{point.name} — {point.postal_code} {point.city} ({point.carrier})</option>)}</select>}</div>}

                <div className="pt-3 border-t border-stone-800 flex justify-between text-sm font-serif text-[#C4A77D]">
                  <span>
                    Total
                  </span>

                  <span>
                    {finalTotal.toFixed(2)} €
                  </span>
                </div>
              </div>

              <label className="flex items-start gap-2 text-xs text-stone-500"><input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} required /> J’accepte les <Link href="/cgv-cgu" className="text-[#C4A77D] underline">CGV-CGU</Link>.</label>
              <button
                type="button"
                onClick={
                  handleTestCheckout
                }
                disabled={
                  isProcessing
                }
                className="w-full bg-[#C4A77D] text-black py-3 uppercase tracking-widest font-medium disabled:opacity-50"
              >
                {isProcessing
                  ? "Traitement..."
                  : "Payer la commande"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default CartPage;

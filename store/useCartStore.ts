import { create } from "zustand";

export interface CartItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  stock?: number;
  options?: {
    formule?: string;
    finition?: string;
    categories?: string[];
    [key: string]: any;
  };
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  syncCart: () => void;
  clearCart: () => void;
  resetCart: () => void;
  removeItem: (id: number | string, options?: CartItem["options"]) => void;
  updateQuantity: (id: number | string, quantity: number, options?: CartItem["options"]) => void;
}

const getStorageKey = () => {
  if (typeof window === "undefined") return "lyjy_cart_guest";

  const userJson = localStorage.getItem("lyjy_current_user");

  if (userJson) {
    try {
      const user = JSON.parse(userJson);

      return user?.email
        ? `lyjy_cart_${user.email}`
        : "lyjy_cart_guest";
    } catch {
      return "lyjy_cart_guest";
    }
  }

  return "lyjy_cart_guest";
};

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],

  syncCart: () => {
    const key = getStorageKey();
    const data = localStorage.getItem(key);
    const parsed = data ? JSON.parse(data) : [];

    set({
      items: Array.isArray(parsed) ? parsed : [],
    });
  },

  addItem: (item) => {
    const key = getStorageKey();
    const current = get().items;

    // Comparaison prenant en compte l'ID et la présence/contenu des options
    const existingIndex = current.findIndex((i) => {
      const sameId = i.id === item.id;
      const sameOptions = JSON.stringify(i.options || {}) === JSON.stringify(item.options || {});
      return sameId && sameOptions;
    });

    let updated: CartItem[];

    if (existingIndex > -1) {
      updated = current.map((i, idx) =>
        idx === existingIndex
          ? {
              ...i,
              quantity: i.quantity + item.quantity,
            }
          : i,
      );
    } else {
      updated = [...current, item];
    }

    localStorage.setItem(
      key,
      JSON.stringify(updated),
    );

    set({ items: updated });
  },

  removeItem: (id, options) => {
    const key = getStorageKey();
    const current = get().items;

    const updated = current.filter((item) => {
      if (item.id !== id) return true;
      if (options === undefined) return false;
      return JSON.stringify(item.options || {}) !== JSON.stringify(options || {});
    });

    localStorage.setItem(
      key,
      JSON.stringify(updated),
    );

    set({ items: updated });
  },

  updateQuantity: (id, quantity, options) => {
    const key = getStorageKey();
    const updated = get().items.map(item => item.id === id && JSON.stringify(item.options || {}) === JSON.stringify(options || {}) ? { ...item, quantity: Math.min(Math.max(1, Math.floor(quantity)), item.stock || 99) } : item);
    localStorage.setItem(key, JSON.stringify(updated));
    set({ items: updated });
  },

  clearCart: () => {
    const key = getStorageKey();

    localStorage.removeItem(key);

    set({ items: [] });
  },

  resetCart: () => {
    set({ items: [] });
  },
}));

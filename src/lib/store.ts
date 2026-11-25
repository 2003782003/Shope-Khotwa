import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, ProductColor, Lang, DeliveryCompany } from './types';
import { defaultDeliveryCompanies } from './data';

interface AppState {
  // Language
  lang: Lang;
  setLang: (lang: Lang) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, size: string, color: ProductColor) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;

  // UI
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  isFilterOpen: boolean;
  setFilterOpen: (open: boolean) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Filters
  filters: {
    category: string;
    sizes: string[];
    colors: string[];
    priceMin: number;
    priceMax: number;
    brand: string;
  };
  setFilter: (key: string, value: unknown) => void;
  resetFilters: () => void;

  // Delivery Companies (display/configuration only; orders use server pricing)
  deliveryCompanies: DeliveryCompany[];
  addDeliveryCompany: (company: DeliveryCompany) => void;
  updateDeliveryCompany: (id: string, updates: Partial<DeliveryCompany>) => void;
  removeDeliveryCompany: (id: string) => void;
  toggleDeliveryCompany: (id: string) => void;
  getActiveDeliveryCompanies: () => DeliveryCompany[];
}

const defaultFilters = {
  category: 'all',
  sizes: [] as string[],
  colors: [] as string[],
  priceMin: 0,
  priceMax: 50000,
  brand: '',
};

/**
 * Client state contains ONLY cart and UI preferences.
 * Orders, customer data and authentication never live in localStorage:
 * they are owned by the server and delivered through the API.
 */
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Language
      lang: 'ar' as Lang,
      setLang: (lang) => set({ lang }),

      // Cart
      cart: [],
      addToCart: (product, size, color) => {
        const cart = get().cart;
        const existing = cart.find(
          (item) =>
            item.product.id === product.id &&
            item.selectedSize === size &&
            item.selectedColor.hex === color.hex,
        );
        if (existing) {
          set({
            cart: cart.map((item) =>
              item === existing ? { ...item, quantity: item.quantity + 1 } : item,
            ),
          });
        } else {
          set({ cart: [...cart, { product, quantity: 1, selectedSize: size, selectedColor: color }] });
        }
      },
      removeFromCart: (productId) =>
        set({ cart: get().cart.filter((item) => item.product.id !== productId) }),
      updateCartQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          set({ cart: get().cart.filter((item) => item.product.id !== productId) });
        } else {
          set({
            cart: get().cart.map((item) =>
              item.product.id === productId ? { ...item, quantity } : item,
            ),
          });
        }
      },
      clearCart: () => set({ cart: [] }),
      getCartTotal: () =>
        get().cart.reduce((total, item) => total + item.product.price * item.quantity, 0),
      getCartCount: () => get().cart.reduce((count, item) => count + item.quantity, 0),

      // UI
      isMobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
      isFilterOpen: false,
      setFilterOpen: (open) => set({ isFilterOpen: open }),

      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Filters
      filters: defaultFilters,
      setFilter: (key, value) => set({ filters: { ...get().filters, [key]: value } }),
      resetFilters: () => set({ filters: defaultFilters }),

      // Delivery Companies
      deliveryCompanies: defaultDeliveryCompanies,
      addDeliveryCompany: (company) =>
        set({ deliveryCompanies: [...get().deliveryCompanies, company] }),
      updateDeliveryCompany: (id, updates) =>
        set({
          deliveryCompanies: get().deliveryCompanies.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        }),
      removeDeliveryCompany: (id) =>
        set({ deliveryCompanies: get().deliveryCompanies.filter((c) => c.id !== id) }),
      toggleDeliveryCompany: (id) =>
        set({
          deliveryCompanies: get().deliveryCompanies.map((c) =>
            c.id === id ? { ...c, active: !c.active } : c,
          ),
        }),
      getActiveDeliveryCompanies: () => get().deliveryCompanies.filter((c) => c.active),
    }),
    {
      name: 'khotwa-store',
      // SECURITY: never persist orders, PII, or authentication state.
      partialize: (state) => ({
        lang: state.lang,
        cart: state.cart,
        deliveryCompanies: state.deliveryCompanies,
      }),
    },
  ),
);

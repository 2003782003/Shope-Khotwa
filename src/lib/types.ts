export interface Product {
  id: string;
  name: Record<Lang, string>;
  description: Record<Lang, string>;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  subcategory?: string;
  brand: string;
  sizes: string[];
  colors: ProductColor[];
  material: Record<Lang, string>;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockQuantity: number;
  featured?: boolean;
  isNew?: boolean;
  discount?: number;
}

export interface ProductColor {
  name: Record<Lang, string>;
  hex: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: ProductColor;
}

export interface Order {
  id: string;
  invoiceNumber: string;
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: ProductColor;
  customer: CustomerInfo;
  deliveryCompany: DeliveryCompany;
  wilaya: string;
  commune: string;
  deliveryPrice: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface CustomerInfo {
  fullName: string;
  phone: string;
  email?: string;
  wilaya: string;
  commune: string;
  address: string;
}

export interface DeliveryCompany {
  id: string;
  name: string;
  logo?: string;
  estimatedDays: string;
  active: boolean;
  phone?: string;
  trackingUrl?: string;
  contactEmail?: string;
  notes?: string;
  createdAt?: string;
}

export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled' | 'returned';
export type PaymentMethod = 'cod' | 'cib' | 'edahabia' | 'ccp' | 'baridimob';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type Lang = 'ar' | 'fr' | 'en';

export interface DeliveryPricing {
  wilaya: string;
  commune: string;
  prices: Record<string, number>; // companyId -> price
}

export interface StoreSettings {
  name: Record<Lang, string>;
  address: string;
  phone: string;
  email: string;
  rc: string; // Registre de Commerce
  nif: string;
  nis: string;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
}

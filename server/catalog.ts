/**
 * Server-side catalog. The client no longer decides prices: every order is
 * priced from this data (in production: the `products` / `wilayas` tables).
 */
import { products as rawProducts, wilayas as rawWilayas, defaultDeliveryCompanies } from '../src/lib/data';
import type { CatalogProduct, CatalogWilaya, CreateOrderInput } from './db/types';

export const catalogProducts: CatalogProduct[] = (rawProducts as unknown as CatalogProduct[]).map((p) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  stockQuantity: p.stockQuantity,
  sizes: p.sizes,
  colors: p.colors,
  images: p.images,
  brand: p.brand,
  material: p.material,
}));

export const catalogWilayas: CatalogWilaya[] = (rawWilayas as unknown as CatalogWilaya[]).map((w) => ({
  code: w.code,
  name: w.name,
  deliveryPrice: w.deliveryPrice,
}));

export const catalogDeliveryCompanies = defaultDeliveryCompanies.map((c) => ({
  id: c.id,
  name: c.name,
  estimatedDays: c.estimatedDays,
  active: c.active,
}));

export function findProduct(id: string): CatalogProduct | undefined {
  return catalogProducts.find((p) => p.id === id);
}

export function findWilaya(code: string): CatalogWilaya | undefined {
  return catalogWilayas.find((w) => w.code === code);
}

export function findDeliveryCompany(id: string) {
  return catalogDeliveryCompanies.find((c) => c.id === id);
}

/**
 * Recomputes an order from server-side data. Any price/quantity/total sent by
 * the browser is ignored (defence against price tampering, checklist #19).
 */
export function priceOrder(input: {
  productId: string;
  quantity: number;
  size: string;
  colorHex: string;
  wilayaCode: string;
  deliveryCompanyId?: string | null;
}): { ok: true; priced: Omit<CreateOrderInput, 'customer' | 'ip' | 'paymentMethod'> } | { ok: false; error: string } {
  const product = findProduct(input.productId);
  if (!product) return { ok: false, error: 'unknown_product' };
  const wilaya = findWilaya(input.wilayaCode);
  if (!wilaya) return { ok: false, error: 'unknown_wilaya' };
  if (!product.sizes.includes(input.size)) return { ok: false, error: 'invalid_size' };
  const color = product.colors.find((c) => c.hex.toLowerCase() === input.colorHex.toLowerCase());
  if (!color) return { ok: false, error: 'invalid_color' };
  if (input.quantity < 1 || input.quantity > 99) return { ok: false, error: 'invalid_quantity' };

  const company = input.deliveryCompanyId ? findDeliveryCompany(input.deliveryCompanyId) : undefined;
  if (input.deliveryCompanyId && !company) return { ok: false, error: 'unknown_delivery_company' };

  const subtotal = product.price * input.quantity;
  const deliveryPrice = wilaya.deliveryPrice;
  const total = subtotal + deliveryPrice;

  return {
    ok: true,
    priced: {
      productId: product.id,
      productName: product.name.en,
      productPrice: product.price,
      quantity: input.quantity,
      selectedSize: input.size,
      colorHex: color.hex,
      colorNameAr: color.name.ar,
      colorNameFr: color.name.fr,
      colorNameEn: color.name.en,
      deliveryCompanyId: company?.id ?? null,
      deliveryCompanyName: company?.name ?? '',
      deliveryPrice,
      subtotal,
      total,
    },
  };
}

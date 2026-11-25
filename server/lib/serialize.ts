import { findProduct } from '../catalog';
import type { OrderRow, SafeUser } from '../db/types';

/**
 * Shapes a database order into the structure the storefront already renders.
 * Prices always originate from the database row, never from the client.
 */
export function serializeOrder(order: OrderRow) {
  const product = findProduct(order.productId);
  return {
    id: order.id,
    invoiceNumber: order.invoiceNumber,
    product: product
      ? {
          id: product.id,
          name: product.name,
          price: product.price,
          images: product.images,
          brand: product.brand,
          sizes: product.sizes,
          colors: product.colors,
          stockQuantity: product.stockQuantity,
          inStock: product.stockQuantity > 0,
        }
      : {
          id: order.productId,
          name: { ar: order.productName, fr: order.productName, en: order.productName },
          price: order.productPrice,
          images: [],
          brand: '',
          sizes: [order.selectedSize],
          colors: [],
          stockQuantity: 0,
          inStock: false,
        },
    quantity: order.quantity,
    selectedSize: order.selectedSize,
    selectedColor: {
      name: {
        ar: order.colorNameAr,
        fr: order.colorNameFr,
        en: order.colorNameEn,
      },
      hex: order.colorHex,
    },
    customer: {
      fullName: order.customer.fullName,
      phone: order.customer.phone,
      email: order.customer.email ?? undefined,
      wilaya: order.customer.wilayaName,
      commune: order.customer.commune,
      address: order.customer.address,
    },
    deliveryCompany: {
      id: order.deliveryCompanyId ?? '',
      name: order.deliveryCompanyName,
      estimatedDays: '',
      active: true,
    },
    wilaya: order.customer.wilayaName,
    commune: order.customer.commune,
    deliveryPrice: order.deliveryPrice,
    subtotal: order.subtotal,
    total: order.total,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

/** Reduced tracking payload: no address, no email. */
export function serializeTracking(order: OrderRow) {
  return {
    id: order.id,
    invoiceNumber: order.invoiceNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    productName: order.productName,
    quantity: order.quantity,
    selectedSize: order.selectedSize,
    total: order.total,
    wilaya: order.customer.wilayaName,
    commune: order.customer.commune,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function serializeUser(user: SafeUser) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

import { z } from 'zod';
import { AppError } from './errors';

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456789012', 'qwertyuiop',
  'admin123456', 'letmein12345', 'welcome12345', 'iloveyou1234',
  'khotwa123456', 'administrator', 'changeme1234',
]);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email();

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128)
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), 'Password is too common')
  .refine((v) => new Set(v).size >= 6, 'Password is too repetitive');

export const loginPasswordSchema = z.string().min(1).max(200);

export const fullNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[\p{L}\p{M}\s'.-]+$/u, 'Invalid characters in name');

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.-]/g, ''))
  .refine((v) => /^(?:\+213|0)[5-7]\d{8}$/.test(v), 'Invalid Algerian phone number');

export const wilayaCodeSchema = z
  .string()
  .trim()
  .regex(/^(0[1-9]|[1-5][0-9]|58)$/, 'Invalid wilaya code');

export const communeSchema = z.string().trim().min(2).max(100);
export const addressSchema = z.string().trim().min(5).max(300);
export const optionalEmailSchema = z.union([z.literal(''), emailSchema]).optional();

export const productIdSchema = z.string().trim().regex(/^[a-zA-Z0-9_-]{1,64}$/);
export const colorHexSchema = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/);
export const sizeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}$/)
  .refine((v) => Number(v) >= 35 && Number(v) <= 50, 'Invalid size');
export const quantitySchema = z.coerce.number().int().min(1).max(99);
export const invoiceSchema = z.string().trim().regex(/^INV-\d{4}-\d{4,8}$/);
export const otpCodeSchema = z.string().trim().regex(/^\d{6}$/);
export const opaqueTokenSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{32,128}$/);
export const uuidSchema = z.string().uuid();

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const passwordChangeSchema = z.object({
  currentPassword: loginPasswordSchema,
  newPassword: passwordSchema,
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetConfirmSchema = z.object({
  token: opaqueTokenSchema,
  newPassword: passwordSchema,
});

export const emailSetupSchema = z.object({
  setupToken: opaqueTokenSchema,
  email: emailSchema,
});

export const emailCodeVerifySchema = z.object({
  challengeToken: opaqueTokenSchema,
  code: otpCodeSchema,
});

export const emailCodeResendSchema = z.object({
  challengeToken: opaqueTokenSchema,
});

export const staffEmailUpdateSchema = z.object({
  email: emailSchema,
});

export const createOrderSchema = z.object({
  productId: productIdSchema,
  size: sizeSchema,
  colorHex: colorHexSchema,
  quantity: quantitySchema,
  wilayaCode: wilayaCodeSchema,
  deliveryCompanyId: z.string().trim().regex(/^[a-zA-Z0-9_-]{1,64}$/).optional(),
  customer: z.object({
    fullName: fullNameSchema,
    phone: phoneSchema,
    email: optionalEmailSchema,
    commune: communeSchema,
    address: addressSchema,
  }),
  // Any client-sent prices are deliberately not part of the schema.
});

export const trackOrderSchema = z.object({
  invoice: invoiceSchema,
  phone: phoneSchema,
});

export const orderStatusSchema = z.enum([
  'new', 'confirmed', 'preparing', 'shipped', 'in_transit', 'delivered', 'cancelled', 'returned',
]);

export const updateStatusSchema = z.object({
  status: orderStatusSchema,
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

/** Parse untrusted input; never echo raw Zod errors to the client. */
export function parseBody<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, 'invalid_input', 'One or more fields are invalid', {
      fields: result.error.issues.map((i) => i.path.join('.')),
    });
  }
  return result.data;
}

/**
 * Client-side form validation.
 *
 * This exists ONLY to give the shopper fast feedback. It is not a security
 * control: the API validates every field again with zod and recomputes all
 * prices, so a modified bundle cannot bypass anything here.
 */

export function sanitizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizePhone(value: string): string {
  return value.replace(/[\s.-]/g, '');
}

const PHONE_RE = /^(?:\+213|0)[5-7]\d{8}$/;
const WILAYA_RE = /^(0[1-9]|[1-5][0-9]|58)$/;
const NAME_RE = /^[\p{L}\p{M}\s'.-]+$/u;

export const validators = {
  fullName: (value: string): boolean => {
    const v = sanitizeText(value);
    return v.length >= 2 && v.length <= 100 && NAME_RE.test(v);
  },
  phone: (value: string): boolean => PHONE_RE.test(normalizePhone(value)),
  wilayaCode: (value: string): boolean => WILAYA_RE.test(value),
  commune: (value: string): boolean => {
    const v = sanitizeText(value);
    return v.length >= 2 && v.length <= 100;
  },
  address: (value: string): boolean => {
    const v = sanitizeText(value);
    return v.length >= 5 && v.length <= 300;
  },
  size: (value: string): boolean => /^\d{2}$/.test(value) && Number(value) >= 35 && Number(value) <= 50,
  quantity: (value: number): boolean => Number.isInteger(value) && value >= 1 && value <= 99,
};

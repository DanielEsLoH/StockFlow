// ============================================================================
// SHARED HELPER FUNCTIONS FOR ALL SEEDERS
// ============================================================================

export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(n, arr.length));
}

export function generateEAN13(prefix: string, index: number): string {
  const base = (prefix + String(index).padStart(12 - prefix.length, '0')).slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return base + check;
}

export function productImageUrl(sku: string): string {
  return `https://picsum.photos/seed/${sku}/400/400`;
}

export function avatarUrl(firstName: string, lastName: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=random&size=200&bold=true&format=png`;
}

export function recentBiasedDaysAgo(maxDays: number): number {
  const r = Math.random();
  return Math.floor(r * r * maxDays);
}

export function randomDate(from: Date, to: Date): Date {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()));
}

/**
 * Format a counter as a padded number string: "00001", "00012", etc.
 */
export function padNumber(n: number, len = 5): string {
  return String(n).padStart(len, '0');
}

/**
 * Generate a deterministic document number with prefix: "COT-TD-00001"
 */
export function nextDocNumber(
  prefix: string,
  counterRef: { [key: string]: number },
  counterKey: string,
): string {
  counterRef[counterKey] = (counterRef[counterKey] || 0) + 1;
  return `${prefix}-${padNumber(counterRef[counterKey])}`;
}

/**
 * Compute COP amounts: subtotal, tax, total
 */
export function computeLineAmounts(
  quantity: number,
  unitPrice: number,
  taxRate: number,
  discount = 0,
): { subtotal: number; tax: number; total: number } {
  const subtotal = quantity * unitPrice - discount;
  const tax = Math.round(subtotal * taxRate / 100);
  return { subtotal, tax, total: subtotal + tax };
}

/**
 * Sum up invoice/document items to get totals
 */
export function sumDocumentTotals(
  items: Array<{ subtotal: number; tax: number; total: number }>,
): { subtotal: number; tax: number; total: number } {
  return items.reduce(
    (acc, item) => ({
      subtotal: acc.subtotal + item.subtotal,
      tax: acc.tax + item.tax,
      total: acc.total + item.total,
    }),
    { subtotal: 0, tax: 0, total: 0 },
  );
}

/**
 * Tenant key abbreviations for document numbering
 */
export const TENANT_PREFIX: Record<string, string> = {
  'tienda-demo': 'TD',
  'distribuidora-nacional': 'DN',
  'nuevo-negocio': 'NN',
  'papeleria-central': 'PC',
};

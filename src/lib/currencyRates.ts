// Fixed exchange rates (date of import: June 2026)
// Source: approximate mid-market rates, consistent with internship context
export const FX_RATES: Record<string, number> = {
  INR: 1,
  USD: 84,
  EUR: 91,
  GBP: 107,
  AED: 22.9,
};

export const FX_RATE_DATE = "2026-03-01"; // approx rate date for the CSV data

export function toInr(amount: number, currency: string): number {
  const rate = FX_RATES[currency.toUpperCase()];
  if (!rate) throw new Error(`Unknown currency: ${currency}`);
  return Math.round(amount * rate * 100) / 100; // round to 2 decimal places
}

export function isForeignCurrency(currency: string): boolean {
  return currency.toUpperCase() !== "INR";
}

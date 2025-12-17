// Currency types and utilities for multi-currency support

export type SupportedCurrency = 'AED' | 'USD' | 'QAR' | 'SAR' | 'LKR';

export interface CurrencyInfo {
  code: SupportedCurrency;
  name: string;
  symbol: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', flag: '🇶🇦' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', flag: '🇸🇦' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', flag: '🇱🇰' },
];

export const DEFAULT_CURRENCY: SupportedCurrency = 'AED';

// Default exchange rates to AED (as fallback)
// These rates are approximate and should be updated from a real API
export const DEFAULT_EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  AED: 1.0,
  USD: 3.6725,    // 1 USD = 3.6725 AED
  QAR: 1.009,     // 1 QAR = 1.009 AED
  SAR: 0.97933,   // 1 SAR = 0.97933 AED
  LKR: 0.0125,    // 1 LKR = 0.0125 AED
};

/**
 * Get currency info by code
 */
export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return SUPPORTED_CURRENCIES.find(c => c.code === code);
}

/**
 * Convert amount from one currency to AED
 */
export function convertToAED(
  amount: number,
  fromCurrency: SupportedCurrency,
  exchangeRate?: number
): number {
  const rate = exchangeRate ?? DEFAULT_EXCHANGE_RATES[fromCurrency];
  return amount * rate;
}

/**
 * Convert amount from AED to target currency
 */
export function convertFromAED(
  amountInAED: number,
  toCurrency: SupportedCurrency,
  exchangeRate?: number
): number {
  const rate = exchangeRate ?? DEFAULT_EXCHANGE_RATES[toCurrency];
  if (rate === 0) return 0;
  return amountInAED / rate;
}

/**
 * Format currency with proper symbol and locale
 */
export function formatCurrencyWithCode(
  amount: number,
  currency: SupportedCurrency = 'AED',
  options?: { showSymbol?: boolean; showCode?: boolean }
): string {
  const { showSymbol = true, showCode = true } = options || {};
  const currencyInfo = getCurrencyInfo(currency);

  const formattedAmount = amount.toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (showCode && currencyInfo) {
    return `${currencyInfo.code} ${formattedAmount}`;
  }
  if (showSymbol && currencyInfo) {
    return `${currencyInfo.symbol} ${formattedAmount}`;
  }
  return formattedAmount;
}

/**
 * Format amount with both currencies (original and AED equivalent)
 */
export function formatDualCurrency(
  amount: number,
  currency: SupportedCurrency,
  exchangeRate?: number
): { original: string; aedEquivalent: string | null } {
  const original = formatCurrencyWithCode(amount, currency);

  if (currency === 'AED') {
    return { original, aedEquivalent: null };
  }

  const aedAmount = convertToAED(amount, currency, exchangeRate);
  const aedEquivalent = formatCurrencyWithCode(aedAmount, 'AED');

  return { original, aedEquivalent };
}

/**
 * Get exchange rate for a currency to AED
 * This function can be extended to fetch real-time rates from an API
 */
export async function getExchangeRate(
  fromCurrency: SupportedCurrency,
  date?: Date
): Promise<number> {
  // For now, return default rates
  // In production, this could fetch from an API like:
  // - Exchange Rate API
  // - Open Exchange Rates
  // - Currency Layer
  // - or from the exchange_rates table in Supabase
  return DEFAULT_EXCHANGE_RATES[fromCurrency];
}

/**
 * Validate if a currency code is supported
 */
export function isValidCurrency(code: string): code is SupportedCurrency {
  return SUPPORTED_CURRENCIES.some(c => c.code === code);
}

/**
 * Get display string for currency selection dropdown
 */
export function getCurrencyDisplayString(currency: CurrencyInfo): string {
  return `${currency.flag} ${currency.code} - ${currency.name}`;
}

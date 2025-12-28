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
 * Fetches real-time rates from our API endpoint
 */
export async function getExchangeRate(
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency = 'AED'
): Promise<{ rate: number; date: string; source: string }> {
  try {
    const response = await fetch(
      `/api/exchange-rate?from=${fromCurrency}&to=${toCurrency}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }

    const data = await response.json();

    return {
      rate: data.rate,
      date: data.date,
      source: data.source,
    };
  } catch {
    // Return fallback rate when API fails
    return {
      rate: DEFAULT_EXCHANGE_RATES[fromCurrency],
      date: new Date().toISOString().split('T')[0],
      source: 'fallback',
    };
  }
}

/**
 * Get real-time exchange rate (client-side function)
 * This fetches the current rate at the time of submission
 */
export async function fetchLiveExchangeRate(
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency = 'AED'
): Promise<number> {
  const { rate } = await getExchangeRate(fromCurrency, toCurrency);
  return rate;
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

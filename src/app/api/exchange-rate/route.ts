import { NextResponse } from 'next/server';

import { DEFAULT_CURRENCY, DEFAULT_EXCHANGE_RATES, isValidCurrency } from '@/lib/currency';
import type { SupportedCurrency } from '@/lib/currency';

// FreeCurrencyAPI - Real-time exchange rates
const FREECURRENCY_API_URL = 'https://api.freecurrencyapi.com/v1/latest';
// Provided default key to avoid silent fallbacks when env vars are missing
const DEFAULT_FREECURRENCY_API_KEY = 'fca_live_JFtriOcYvYN4VX44KuAK6cs09VBPNJxX8ZfFPuWa';

function normalizeCurrencyParam(
  value: string | null,
  fallback: SupportedCurrency = DEFAULT_CURRENCY
): SupportedCurrency {
  if (!value) return fallback;

  const normalized = value.toUpperCase();
  return isValidCurrency(normalized) ? normalized : fallback;
}

function resolveApiKey(): string {
  const apiKey =
    process.env.FREECURRENCY_API_KEY ||
    process.env.NEXT_PUBLIC_FREECURRENCY_API_KEY ||
    DEFAULT_FREECURRENCY_API_KEY;

  return apiKey.trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromCurrency = normalizeCurrencyParam(searchParams.get('from'));
  const toCurrency = normalizeCurrencyParam(searchParams.get('to'));

  const apiKey = resolveApiKey();

  try {
    // Fetch exchange rate from FreeCurrencyAPI
    // Get rates with base currency as the 'from' currency
    const url = new URL(FREECURRENCY_API_URL);
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('base_currency', fromCurrency);
    url.searchParams.set('currencies', toCurrency);

    const response = await fetch(url, {
      cache: 'no-store', // Always fetch fresh rates at submission time
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FreeCurrencyAPI error:', errorText);
      throw new Error('Failed to fetch exchange rate from FreeCurrencyAPI');
    }

    const data = await response.json();

    if (!data?.data) {
      const message = data?.message || 'Invalid response from FreeCurrencyAPI';
      throw new Error(message);
    }

    // FreeCurrencyAPI returns { data: { AED: 3.6725 } }
    const rate = data.data?.[toCurrency];

    if (!rate) {
      throw new Error(`Rate not found for ${toCurrency}`);
    }

    return NextResponse.json({
      success: true,
      from: fromCurrency,
      to: toCurrency,
      rate: rate,
      date: new Date().toISOString().split('T')[0],
      source: 'freecurrencyapi.com',
    });
  } catch (error) {
    console.error('Exchange rate API error:', error);

    // Return fallback rate
    const fallbackRate = calculateFallbackRate(fromCurrency, toCurrency);

    return NextResponse.json({
      success: true,
      from: fromCurrency,
      to: toCurrency,
      rate: fallbackRate,
      date: new Date().toISOString().split('T')[0],
      source: 'fallback',
      warning: 'Using fallback rates due to API unavailability',
    });
  }
}

function calculateFallbackRate(
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): number {
  let fallbackRate = 1;

  if (toCurrency === 'AED') {
    // Converting TO AED
    fallbackRate = DEFAULT_EXCHANGE_RATES[fromCurrency] || 1;
  } else if (fromCurrency === 'AED') {
    // Converting FROM AED
    fallbackRate = 1 / (DEFAULT_EXCHANGE_RATES[toCurrency] || 1);
  } else {
    // Cross conversion via AED
    const fromToAed = DEFAULT_EXCHANGE_RATES[fromCurrency] || 1;
    const toToAed = DEFAULT_EXCHANGE_RATES[toCurrency] || 1;
    fallbackRate = fromToAed / toToAed;
  }

  return fallbackRate;
}

import { NextResponse } from 'next/server';

import { DEFAULT_CURRENCY, DEFAULT_EXCHANGE_RATES, isValidCurrency } from '@/lib/currency';
import type { SupportedCurrency } from '@/lib/currency';

// FreeCurrencyAPI - Real-time exchange rates
const FREECURRENCY_API_URL = 'https://api.freecurrencyapi.com/v1/latest';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawFromCurrency = (searchParams.get('from') || DEFAULT_CURRENCY).toUpperCase();
  const rawToCurrency = (searchParams.get('to') || DEFAULT_CURRENCY).toUpperCase();
  const fromCurrency: SupportedCurrency = isValidCurrency(rawFromCurrency)
    ? rawFromCurrency
    : DEFAULT_CURRENCY;
  const toCurrency: SupportedCurrency = isValidCurrency(rawToCurrency)
    ? rawToCurrency
    : DEFAULT_CURRENCY;

  const apiKey = process.env.FREECURRENCY_API_KEY || process.env.NEXT_PUBLIC_FREECURRENCY_API_KEY;

  if (!apiKey) {
    const fallbackRate = calculateFallbackRate(fromCurrency, toCurrency);
    return NextResponse.json({
      success: true,
      from: fromCurrency,
      to: toCurrency,
      rate: fallbackRate,
      date: new Date().toISOString().split('T')[0],
      source: 'fallback',
      warning: 'Missing FREECURRENCY_API_KEY, using default exchange rates',
    });
  }

  try {
    // Fetch exchange rate from FreeCurrencyAPI
    // Get rates with base currency as the 'from' currency
    const response = await fetch(
      `${FREECURRENCY_API_URL}?apikey=${apiKey}&base_currency=${fromCurrency}&currencies=${toCurrency}`,
      {
        cache: 'no-store', // Always fetch fresh rates at submission time
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FreeCurrencyAPI error:', errorText);
      throw new Error('Failed to fetch exchange rate from FreeCurrencyAPI');
    }

    const data = await response.json();

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

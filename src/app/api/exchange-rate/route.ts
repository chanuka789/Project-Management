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

  const apiKey = process.env.FREECURRENCY_API_KEY;

  if (!apiKey) {
    console.warn('FREECURRENCY_API_KEY not configured, using fallback rates');
    const fallbackRate = calculateFallbackRate(fromCurrency, toCurrency);
    return NextResponse.json({
      success: true,
      from: fromCurrency,
      to: toCurrency,
      rate: fallbackRate,
      date: new Date().toISOString().split('T')[0],
      source: 'fallback',
      warning: 'API key missing, using fallback exchange rates',
    });
  }

  try {
    // Use apikey as header for better security
    const url = new URL(FREECURRENCY_API_URL);
    url.searchParams.append('base_currency', fromCurrency);
    url.searchParams.append('currencies', toCurrency);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        apikey: apiKey,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FreeCurrencyAPI HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API key or insufficient permissions');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.data || typeof data.data !== 'object') {
      console.error('Unexpected API response structure:', data);
      throw new Error('Invalid response structure from API');
    }

    const rate = data.data[toCurrency];

    if (rate === undefined || rate === null) {
      console.error('Rate not found in response:', {
        toCurrency,
        availableCurrencies: Object.keys(data.data),
      });
      throw new Error(`Rate not found for ${toCurrency}`);
    }

    return NextResponse.json({
      success: true,
      from: fromCurrency,
      to: toCurrency,
      rate: parseFloat(rate),
      date: data.meta?.last_updated_at || new Date().toISOString().split('T')[0],
      source: 'freecurrencyapi.com',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Exchange rate API error:', errorMessage);

    // Return fallback rate
    const fallbackRate = calculateFallbackRate(fromCurrency, toCurrency);

    return NextResponse.json({
      success: true,
      from: fromCurrency,
      to: toCurrency,
      rate: fallbackRate,
      date: new Date().toISOString().split('T')[0],
      source: 'fallback',
      warning: `Using fallback rates: ${errorMessage}`,
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

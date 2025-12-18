import { NextResponse } from 'next/server';

// Free exchange rate API - uses Google Finance data via exchangerate-api
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest';

// Fallback rates in case API fails (rates to AED)
const FALLBACK_RATES: Record<string, number> = {
  AED: 1.0,
  USD: 3.6725,
  QAR: 1.009,
  SAR: 0.97933,
  LKR: 0.0125,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromCurrency = searchParams.get('from') || 'USD';
  const toCurrency = searchParams.get('to') || 'AED';

  try {
    // Fetch exchange rate from API
    const response = await fetch(`${EXCHANGE_RATE_API}/${fromCurrency}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }

    const data = await response.json();

    // Get the rate for the target currency
    const rate = data.rates[toCurrency];

    if (!rate) {
      throw new Error(`Rate not found for ${toCurrency}`);
    }

    return NextResponse.json({
      success: true,
      from: fromCurrency,
      to: toCurrency,
      rate: rate,
      date: new Date().toISOString().split('T')[0],
      source: 'exchangerate-api.com',
    });
  } catch (error) {
    console.error('Exchange rate API error:', error);

    // Return fallback rate
    let fallbackRate = 1;

    if (toCurrency === 'AED') {
      // Converting TO AED
      fallbackRate = FALLBACK_RATES[fromCurrency] || 1;
    } else if (fromCurrency === 'AED') {
      // Converting FROM AED
      fallbackRate = 1 / (FALLBACK_RATES[toCurrency] || 1);
    } else {
      // Cross conversion via AED
      const fromToAed = FALLBACK_RATES[fromCurrency] || 1;
      const toToAed = FALLBACK_RATES[toCurrency] || 1;
      fallbackRate = fromToAed / toToAed;
    }

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

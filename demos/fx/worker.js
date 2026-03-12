// AIEndpoint Demo — FX (Currency Exchange)
// Cloudflare Workers — free tier deployment
// Deploy: wrangler deploy
// Local:  wrangler dev --port 3003

const AI_SPEC = {
  aiendpoint: '1.0',
  service: {
    name: 'DemoFX',
    description: 'Get currency exchange rates. Supports 10 major currencies.',
    category: ['finance', 'data'],
    language: ['en']
  },
  capabilities: [
    {
      id: 'get_rate',
      description: 'Get exchange rate between two currencies',
      endpoint: '/api/rate',
      method: 'GET',
      params: {
        from: 'string, required — source currency code (USD|KRW|EUR|JPY|GBP|CNY|AUD|CAD|CHF|HKD)',
        to: 'string, required — target currency code (same options)',
        amount: 'number, optional, default 1 — amount to convert'
      },
      returns: 'from, to, rate, amount, converted_amount, last_updated'
    },
    {
      id: 'list_currencies',
      description: 'List all supported currency codes and names',
      endpoint: '/api/currencies',
      method: 'GET',
      params: {},
      returns: 'currencies[] {code, name, symbol}'
    },
    {
      id: 'get_all_rates',
      description: 'Get all rates relative to a base currency',
      endpoint: '/api/rates',
      method: 'GET',
      params: {
        base: 'string, required — base currency code (USD|KRW|EUR|JPY|GBP|CNY|AUD|CAD|CHF|HKD)'
      },
      returns: 'base, rates{currency_code: rate}, last_updated'
    }
  ],
  auth: { type: 'none' },
  token_hints: {
    compact_mode: false,
    field_filtering: false,
    delta_support: false
  },
  meta: { last_updated: '2026-03-10' }
};

// Dummy exchange rates — USD base
const BASE_RATES_USD = {
  USD: 1,
  KRW: 1342.50,
  EUR: 0.9215,
  JPY: 148.72,
  GBP: 0.7891,
  CNY: 7.2341,
  AUD: 1.5423,
  CAD: 1.3621,
  CHF: 0.8934,
  HKD: 7.8241
};

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar',          symbol: '$'   },
  { code: 'KRW', name: 'Korean Won',          symbol: '₩'   },
  { code: 'EUR', name: 'Euro',                symbol: '€'   },
  { code: 'JPY', name: 'Japanese Yen',        symbol: '¥'   },
  { code: 'GBP', name: 'British Pound',       symbol: '£'   },
  { code: 'CNY', name: 'Chinese Yuan',        symbol: '¥'   },
  { code: 'AUD', name: 'Australian Dollar',   symbol: 'A$'  },
  { code: 'CAD', name: 'Canadian Dollar',     symbol: 'C$'  },
  { code: 'CHF', name: 'Swiss Franc',         symbol: 'Fr'  },
  { code: 'HKD', name: 'Hong Kong Dollar',    symbol: 'HK$' }
];

function getRate(from, to) {
  const fromRate = BASE_RATES_USD[from];
  const toRate = BASE_RATES_USD[to];
  if (!fromRate || !toRate) return null;
  return toRate / fromRate;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const params = url.searchParams;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*'
        }
      });
    }

    // GET /ai
    if (path === '/ai') {
      return json(AI_SPEC);
    }

    // GET /api/currencies
    if (path === '/api/currencies') {
      return json({ count: CURRENCIES.length, currencies: CURRENCIES });
    }

    // GET /api/rate?from=USD&to=KRW&amount=100
    if (path === '/api/rate') {
      const from = params.get('from')?.toUpperCase();
      const to = params.get('to')?.toUpperCase();
      const amount = parseFloat(params.get('amount') || '1');

      if (!from || !to) {
        return json({ error: '"from" and "to" are required', code: 'MISSING_PARAM' }, 400);
      }

      const rate = getRate(from, to);
      if (rate === null) {
        return json({
          error: `Unsupported currency. Use /api/currencies for the list.`,
          code: 'NOT_FOUND'
        }, 404);
      }

      if (isNaN(amount) || amount <= 0) {
        return json({ error: '"amount" must be a positive number', code: 'INVALID_PARAM' }, 400);
      }

      return json({
        from,
        to,
        rate: Math.round(rate * 10000) / 10000,
        amount,
        converted_amount: Math.round(rate * amount * 100) / 100,
        last_updated: '2026-03-10T00:00:00Z'
      });
    }

    // GET /api/rates?base=KRW
    if (path === '/api/rates') {
      const base = params.get('base')?.toUpperCase();
      if (!base || !BASE_RATES_USD[base]) {
        return json({
          error: 'Valid "base" currency required',
          code: 'MISSING_PARAM',
          supported: Object.keys(BASE_RATES_USD)
        }, 400);
      }

      const rates = {};
      for (const code of Object.keys(BASE_RATES_USD)) {
        if (code !== base) {
          rates[code] = Math.round(getRate(base, code) * 10000) / 10000;
        }
      }

      return json({ base, rates, last_updated: '2026-03-10T00:00:00Z' });
    }

    // GET /status
    if (path === '/status') {
      return json({ status: 'ok', service: 'demo-fx' });
    }

    return json({ error: 'Not found', hint: 'Try GET /ai' }, 404);
  }
};

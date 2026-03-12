const express = require('express');
const cors = require('cors');
const articles = require('./data/articles.json');

const app = express();
app.use(cors());
app.use(express.json());

// ─── /ai endpoint ──────────────────────────────────────────────────────────
app.get('/ai', (req, res) => {
  res.json({
    aiendpoint: '1.0',
    service: {
      name: 'DemoNews',
      description: 'Search and retrieve recent news articles by keyword or category.',
      category: ['news', 'search'],
      language: ['en']
    },
    capabilities: [
      {
        id: 'search_articles',
        description: 'Search news articles by keyword',
        endpoint: '/api/articles/search',
        method: 'GET',
        params: {
          q: 'string, required — search keyword',
          category: 'string, optional — filter by category (technology|business|politics|health)',
          limit: 'integer, optional, default 5, max 20'
        },
        returns: 'articles[] {id, title, summary, category, published_at, source, url}'
      },
      {
        id: 'get_latest',
        description: 'Get the latest news articles',
        endpoint: '/api/articles/latest',
        method: 'GET',
        params: {
          limit: 'integer, optional, default 5, max 20',
          category: 'string, optional — filter by category'
        },
        returns: 'articles[] {id, title, summary, category, published_at, source, url}'
      },
      {
        id: 'get_article',
        description: 'Get full content of a specific article by ID',
        endpoint: '/api/articles/:id',
        method: 'GET',
        params: {
          id: 'string, required — article ID from search results'
        },
        returns: 'article {id, title, summary, category, published_at, source, url}'
      }
    ],
    auth: { type: 'none' },
    token_hints: {
      compact_mode: true,
      field_filtering: true,
      delta_support: false
    },
    meta: {
      last_updated: '2026-03-10',
      status: '/status'
    }
  });
});

// ─── API endpoints ─────────────────────────────────────────────────────────
app.get('/api/articles/search', (req, res) => {
  const { q, category, limit = '5', fields, compact } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'q parameter is required', code: 'MISSING_PARAM' });
  }

  const keyword = q.toLowerCase();
  let results = articles.filter(a =>
    a.title.toLowerCase().includes(keyword) ||
    a.summary.toLowerCase().includes(keyword)
  );

  if (category) {
    results = results.filter(a => a.category === category);
  }

  results = results.slice(0, Math.min(parseInt(limit, 10), 20));

  if (compact === 'true') {
    results = results.map(({ id, title, category, published_at, source }) =>
      ({ id, title, category, published_at, source })
    );
  } else if (fields) {
    const fieldList = fields.split(',').map(f => f.trim());
    results = results.map(a =>
      Object.fromEntries(fieldList.map(f => [f, a[f]]).filter(([, v]) => v !== undefined))
    );
  }

  res.json({ count: results.length, articles: results });
});

app.get('/api/articles/latest', (req, res) => {
  const { limit = '5', category, compact } = req.query;

  let results = [...articles].sort(
    (a, b) => new Date(b.published_at) - new Date(a.published_at)
  );

  if (category) {
    results = results.filter(a => a.category === category);
  }

  results = results.slice(0, Math.min(parseInt(limit, 10), 20));

  if (compact === 'true') {
    results = results.map(({ id, title, category, published_at, source }) =>
      ({ id, title, category, published_at, source })
    );
  }

  res.json({ count: results.length, articles: results });
});

app.get('/api/articles/:id', (req, res) => {
  const article = articles.find(a => a.id === req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found', code: 'NOT_FOUND' });
  }
  res.json(article);
});

app.get('/status', (req, res) => {
  res.json({ status: 'ok', service: 'demo-news', uptime: Math.floor(process.uptime()) });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', hint: 'Try GET /ai' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Demo News running on http://localhost:${PORT}`);
  console.log(`  /ai        → spec`);
  console.log(`  /api/articles/search?q=agent`);
  console.log(`  /api/articles/latest`);
});

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// ── In-memory SSR cache ───────────────────────────────────────────────────────
const ssrCache = new Map<string, { html: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const PRIVATE_PREFIXES = [
  '/cart', '/checkout', '/profile',
  '/seller-dashboard', '/login', '/signup',
  '/forgot-pwd', '/admin',
];

function isPrivateRoute(url: string): boolean {
  return PRIVATE_PREFIXES.some(p => url.startsWith(p));
}

// ── Static files ──────────────────────────────────────────────────────────────
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

// ── Sitemap ───────────────────────────────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  const base = 'https://techwaveelectronics.co.ke';
  const today = new Date().toISOString().split('T')[0];

  const urls = [
    { loc: `${base}/home`,                           priority: '1.0', changefreq: 'daily'   },
    { loc: `${base}/shop`,                           priority: '0.9', changefreq: 'daily'   },
    { loc: `${base}/deals`,                          priority: '0.8', changefreq: 'daily'   },
    { loc: `${base}/categories/Phones`,              priority: '0.8', changefreq: 'weekly'  },
    { loc: `${base}/categories/Laptops`,             priority: '0.8', changefreq: 'weekly'  },
    { loc: `${base}/categories/Accessories`,         priority: '0.7', changefreq: 'weekly'  },
    { loc: `${base}/categories/Gaming`,              priority: '0.7', changefreq: 'weekly'  },
    { loc: `${base}/categories/Home%20Appliances`,   priority: '0.7', changefreq: 'weekly'  },
    { loc: `${base}/categories/Audio%20%26%20Sound`, priority: '0.7', changefreq: 'weekly'  },
    { loc: `${base}/termsofservice`,                 priority: '0.2', changefreq: 'yearly'  },
    { loc: `${base}/privacypolicy`,                  priority: '0.2', changefreq: 'yearly'  },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.header('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
  res.send(xml);
});

// ── SSR handler ───────────────────────────────────────────────────────────────
app.use('/**', async (req, res, next) => {
  const url = req.originalUrl;
  const skipCache = isPrivateRoute(url);

  if (!skipCache) {
    const entry = ssrCache.get(url);
    if (entry && Date.now() - entry.ts < CACHE_TTL) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(entry.html);
    }
  }

  try {
    const ngResponse = await angularApp.handle(req);
    if (!ngResponse) return next();

    if (!skipCache) {
      const html = await ngResponse.text();
      ssrCache.set(url, { html, ts: Date.now() });

      res.setHeader('X-Cache', 'MISS');
      res.status(ngResponse.status);
      ngResponse.headers.forEach((value, key) => res.setHeader(key, value));
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    writeResponseToNodeResponse(ngResponse, res);
  } catch (err) {
    next(err);
  }
});

// ── Start server ──────────────────────────────────────────────────────────────
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
    console.log(`SSR cache TTL: ${CACHE_TTL / 1000}s | Private routes skip cache`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
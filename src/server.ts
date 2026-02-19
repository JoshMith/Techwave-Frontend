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
// Caches rendered HTML for public pages. First visitor pays the SSR cost;
// everyone after gets the cached HTML instantly until TTL expires.

const ssrCache = new Map<string, { html: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes — adjust as needed

// User-specific routes that must NEVER be cached
const PRIVATE_PREFIXES = [
  '/cart', '/checkout', '/profile',
  '/seller-dashboard', '/login', '/signup',
  '/forgot-pwd', '/admin',
];

function isPrivateRoute(url: string): boolean {
  return PRIVATE_PREFIXES.some(p => url.startsWith(p));
}

// ── Static files (JS/CSS/images) ──────────────────────────────────────────────
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',      // Browsers cache hashed assets for 1 year
    index: false,
    redirect: false,
  }),
);

// ── SSR handler ───────────────────────────────────────────────────────────────
app.use('/**', async (req, res, next) => {
  const url = req.originalUrl;
  const skipCache = isPrivateRoute(url);

  // Serve from cache if available
  if (!skipCache) {
    const entry = ssrCache.get(url);
    if (entry && Date.now() - entry.ts < CACHE_TTL) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(entry.html);
    }
  }

  // Render fresh
  try {
    const ngResponse = await angularApp.handle(req);
    if (!ngResponse) return next();

    // AngularNodeAppEngine returns a Web API Response.
    // We need the HTML body to cache it, so we read it before piping.
    if (!skipCache) {
      const html = await ngResponse.text();
      ssrCache.set(url, { html, ts: Date.now() });

      res.setHeader('X-Cache', 'MISS');
      // Copy status + headers from Angular response
      res.status(ngResponse.status);
      ngResponse.headers.forEach((value, key) => res.setHeader(key, value));
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    // Private routes: pipe directly without caching
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
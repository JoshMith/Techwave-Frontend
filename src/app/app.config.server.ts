import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRouting, RenderMode } from '@angular/ssr';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRouting([
      // ── Prerendered at build time (instant, no SSR cost) ────────────────────
      // Static pages that never change per-user
      { path: 'home',                          renderMode: RenderMode.Prerender },
      { path: 'shop',                          renderMode: RenderMode.Prerender },
      { path: 'deals',                         renderMode: RenderMode.Prerender },
      { path: 'termsofservice',                renderMode: RenderMode.Prerender },
      { path: 'privacypolicy',                 renderMode: RenderMode.Prerender },
      { path: 'categories/Phones',             renderMode: RenderMode.Prerender },
      { path: 'categories/Laptops',            renderMode: RenderMode.Prerender },
      { path: 'categories/Accessories',        renderMode: RenderMode.Prerender },
      { path: 'categories/Home Appliances',    renderMode: RenderMode.Prerender },
      { path: 'categories/Gaming',             renderMode: RenderMode.Prerender },
      { path: 'categories/Audio & Sound',      renderMode: RenderMode.Prerender },

      // ── SSR on first request, then cached by server.ts ──────────────────────
      // Pages with dynamic data but still benefit from server rendering for SEO
      { path: '',                              renderMode: RenderMode.Server },
      { path: 'search',                        renderMode: RenderMode.Server },
      { path: 'product/:id',                   renderMode: RenderMode.Server },

      // ── Client-side only (user-specific, no SEO value) ──────────────────────
      { path: 'cart',                          renderMode: RenderMode.Client },
      { path: 'checkout/details',              renderMode: RenderMode.Client },
      { path: 'checkout/payment',              renderMode: RenderMode.Client },
      { path: 'checkout/orders',               renderMode: RenderMode.Client },
      { path: 'profile',                       renderMode: RenderMode.Client },

      { path: 'seller-dashboard',               renderMode: RenderMode.Client },
      { path: 'seller-dashboard/**',            renderMode: RenderMode.Client },
      
      { path: 'login',                         renderMode: RenderMode.Client },
      { path: 'signup',                        renderMode: RenderMode.Client },
      { path: 'forgot-pwd',                    renderMode: RenderMode.Client },
      { path: 'admin',                         renderMode: RenderMode.Client },
    ])
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
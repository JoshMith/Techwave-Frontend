// src/app/services/analytics.service.ts
//
// Wraps Google Analytics 4 (gtag) for use throughout the Angular app.
// Handles SSR safely — all gtag calls are guarded by isPlatformBrowser.
//
// Usage:
//   constructor(private analytics: AnalyticsService) {}
//
//   // Track page view manually:
//   this.analytics.trackPageView('/shop', 'Shop - TechWave Kenya');
//
//   // Track a purchase:
//   this.analytics.trackPurchase(orderId, totalAmount, items);
//
//   // Track add to cart:
//   this.analytics.trackAddToCart(product, quantity);

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

// Extend Window interface to include gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Your GA4 Measurement ID — replace with your actual ID
const GA_MEASUREMENT_ID = 'G-KKP7M47KMR';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // ── Initialise ────────────────────────────────────────────────────────────
  // Call once from AppComponent.ngOnInit()
  // Subscribes to Angular router events and fires a page_view hit on every
  // NavigationEnd — this is what makes SPA tracking work correctly with SSR.

  init(): void {
    if (!this.isBrowser) return;

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.trackPageView(event.urlAfterRedirects);
      });
  }

  // ── Page Views ────────────────────────────────────────────────────────────

  trackPageView(pagePath: string, pageTitle?: string): void {
    if (!this.isBrowser) return;

    this.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle || document.title,
      page_location: window.location.href,
    });
  }

  // ── Ecommerce Events ──────────────────────────────────────────────────────
  // These follow the GA4 standard ecommerce schema so they appear in the
  // Monetisation > Ecommerce purchases report automatically.

  trackViewProduct(product: GaProduct): void {
    this.gtag('event', 'view_item', {
      currency: 'KES',
      value: product.price,
      items: [this.mapProduct(product, 1)],
    });
  }

  trackAddToCart(product: GaProduct, quantity: number): void {
    this.gtag('event', 'add_to_cart', {
      currency: 'KES',
      value: product.price * quantity,
      items: [this.mapProduct(product, quantity)],
    });
  }

  trackRemoveFromCart(product: GaProduct, quantity: number): void {
    this.gtag('event', 'remove_from_cart', {
      currency: 'KES',
      value: product.price * quantity,
      items: [this.mapProduct(product, quantity)],
    });
  }

  trackBeginCheckout(subtotal: number, items: GaProduct[]): void {
    this.gtag('event', 'begin_checkout', {
      currency: 'KES',
      value: subtotal,
      items: items.map((p, i) => this.mapProduct(p, 1, i)),
    });
  }

  trackPurchase(
    orderId: string | number,
    total: number,
    items: GaCartItem[],
    shipping: number = 0
  ): void {
    this.gtag('event', 'purchase', {
      transaction_id: String(orderId),
      currency: 'KES',
      value: total,
      shipping: shipping,
      items: items.map((item, i) => ({
        item_id: String(item.product_id),
        item_name: item.product_title,
        price: item.unit_price,
        quantity: item.quantity,
        index: i,
      })),
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────

  trackSearch(searchTerm: string, resultsCount?: number): void {
    this.gtag('event', 'search', {
      search_term: searchTerm,
      ...(resultsCount !== undefined && { results_count: resultsCount }),
    });
  }

  // ── User ──────────────────────────────────────────────────────────────────

  trackLogin(method: 'email' | 'google' = 'email'): void {
    this.gtag('event', 'login', { method });
  }

  trackSignUp(method: 'email' | 'google' = 'email'): void {
    this.gtag('event', 'sign_up', { method });
  }

  // ── Custom Events ─────────────────────────────────────────────────────────
  // Use for anything not covered above — appears in GA4 under Events.

  trackEvent(eventName: string, params: Record<string, any> = {}): void {
    this.gtag('event', eventName, params);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private gtag(...args: any[]): void {
    if (!this.isBrowser) return;
    if (typeof window.gtag !== 'function') return; // guard if script blocked
    window.gtag(...args);
  }

  private mapProduct(product: GaProduct, quantity: number, index: number = 0) {
    return {
      item_id: String(product.product_id),
      item_name: product.title,
      item_category: product.category_name ?? '',
      price: product.sale_price ?? product.price,
      quantity,
      index,
    };
  }
}

// ── Type helpers ──────────────────────────────────────────────────────────────
// These mirror fields from your existing Product/CartItem interfaces so you
// don't need to change anything in your existing services.

export interface GaProduct {
  product_id: number | string;
  title: string;
  price: number;
  sale_price?: number | null;
  category_name?: string;
}

export interface GaCartItem {
  product_id: number;
  product_title: string;
  unit_price: number;
  quantity: number;
}
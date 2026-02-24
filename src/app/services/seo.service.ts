import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';

export interface PageSeoConfig {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  ogImage?: string;
}

const BASE_URL = 'h';
const DEFAULT_IMAGE = `${BASE_URL}/images/og-image.jpg`;

@Injectable({ providedIn: 'root' })
export class SeoService {
  constructor(
    private titleService: Title,
    private metaService: Meta,
    private router: Router,
  ) {}

  setPage(config: PageSeoConfig): void {
    const canonical = `${BASE_URL}${config.canonicalPath ?? this.router.url}`;
    const image = config.ogImage ?? DEFAULT_IMAGE;

    // Title
    this.titleService.setTitle(config.title);

    // Core meta
    this.update('description', config.description);
    if (config.keywords) this.update('keywords', config.keywords);
    this.update('robots', 'index, follow');

    // Open Graph
    this.updateProp('og:title', config.title);
    this.updateProp('og:description', config.description);
    this.updateProp('og:url', canonical);
    this.updateProp('og:image', image);
    this.updateProp('og:type', 'website');
    this.updateProp('og:locale', 'en_KE');
    this.updateProp('og:site_name', 'TechWave Kenya');

    // Twitter
    this.update('twitter:title', config.title);
    this.update('twitter:description', config.description);
    this.update('twitter:image', image);
    this.update('twitter:card', 'summary_large_image');

    // Canonical link tag
    this.setCanonical(canonical);
  }

  private update(name: string, content: string): void {
    this.metaService.updateTag({ name, content });
  }

  private updateProp(property: string, content: string): void {
    this.metaService.updateTag({ property, content });
  }

  private setCanonical(url: string): void {
    // Remove any existing canonical, then add fresh one
    const existing = document.querySelector('link[rel="canonical"]');
    if (existing) existing.setAttribute('href', url);
  }
}

// ── Per-page SEO configs ──────────────────────────────────────────────────────
export const PAGE_SEO: Record<string, PageSeoConfig> = {
  home: {
    title: 'TechWave Kenya | Electronics & Gadgets — Phones, Laptops, Accessories',
    description: 'Shop the latest phones, laptops, accessories and more at TechWave Kenya. Best prices in Nairobi & across Kenya. M-Pesa accepted. Fast delivery countrywide.',
    keywords: 'TechWave Kenya, buy electronics Kenya, phones Nairobi, laptops Kenya, M-Pesa electronics',
    canonicalPath: '/home',
  },
  shop: {
    title: 'Shop Electronics in Kenya | TechWave Kenya',
    description: 'Browse all electronics at TechWave Kenya — smartphones, laptops, TVs, accessories and more. Pay with M-Pesa. Fast delivery across Kenya.',
    keywords: 'buy electronics online Kenya, electronics shop Nairobi, online electronics store Kenya',
    canonicalPath: '/shop',
  },
  deals: {
    title: 'Best Electronics Deals in Kenya | TechWave Kenya',
    description: 'Exclusive discounts on phones, laptops and accessories. Limited time offers at TechWave Kenya. Pay with M-Pesa.',
    keywords: 'electronics deals Kenya, phone deals Nairobi, laptop offers Kenya, discounts electronics',
    canonicalPath: '/deals',
  },
  phones: {
    title: 'Buy Smartphones & Phones in Kenya | TechWave Kenya',
    description: 'Shop the latest Android and iOS smartphones in Kenya. Samsung, Tecno, Infinix, iPhone and more. M-Pesa accepted. Fast delivery.',
    keywords: 'buy phone Kenya, smartphones Nairobi, Samsung Kenya, iPhone Kenya, Tecno phones, Infinix Kenya',
    canonicalPath: '/categories/Phones',
  },
  laptops: {
    title: 'Buy Laptops in Kenya | TechWave Kenya',
    description: 'Shop laptops for work, school and gaming in Kenya. HP, Dell, Lenovo, MacBook and more. Best prices with M-Pesa payment.',
    keywords: 'buy laptop Kenya, laptops Nairobi, HP laptop Kenya, Dell laptop Kenya, MacBook Kenya, student laptop Nairobi',
    canonicalPath: '/categories/Laptops',
  },
  accessories: {
    title: 'Phone & Laptop Accessories in Kenya | TechWave Kenya',
    description: 'Cables, chargers, cases, earphones and more accessories in Kenya. Affordable prices with M-Pesa payment.',
    keywords: 'phone accessories Kenya, laptop accessories Nairobi, earphones Kenya, chargers Kenya',
    canonicalPath: '/categories/Accessories',
  },
  gaming: {
    title: 'Gaming Accessories & Consoles in Kenya | TechWave Kenya',
    description: 'Shop gaming consoles, controllers, headsets and accessories in Kenya. PlayStation, Xbox, PC gaming gear.',
    keywords: 'gaming Kenya, PlayStation Kenya, Xbox Kenya, gaming accessories Nairobi, gaming headset Kenya',
    canonicalPath: '/categories/Gaming',
  },
  homeAppliances: {
    title: 'Home Appliances & Electronics in Kenya | TechWave Kenya',
    description: 'Shop home appliances and electronics in Kenya. Microwaves, blenders, smart home devices and more.',
    keywords: 'home appliances Kenya, electronics home Nairobi, smart home Kenya, kitchen electronics',
    canonicalPath: '/categories/Home Appliances',
  },
  audioSound: {
    title: 'Speakers, Headphones & Audio in Kenya | TechWave Kenya',
    description: 'Shop speakers, earphones, headphones and audio equipment in Kenya. JBL, Sony, Samsung and more.',
    keywords: 'speakers Kenya, headphones Nairobi, JBL Kenya, earphones Kenya, audio equipment Kenya',
    canonicalPath: '/categories/Audio & Sound',
  },
};
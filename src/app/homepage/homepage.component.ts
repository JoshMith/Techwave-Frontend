// src/app/homepage/homepage.component.ts

import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { SeoService, PAGE_SEO } from '../services/seo.service';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';

interface Category {
  category_id: number;
  name: string;
  description: string;
  featured: boolean;
  icon_path: string;
  created_at: string;
  icon?: string;
  count?: number;
  key?: string;
}

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FooterComponent],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.css',
})
export class HomepageComponent implements OnInit, OnDestroy {
  readonly isBrowser: boolean;

  featuredCategories: Category[] = [];
  isLoading = true;
  error: string | null = null;

  heroImages: string[] = [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1400&h=700&fit=crop',
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1400&h=700&fit=crop',
    'https://images.unsplash.com/photo-1511385348-a52b4a160dc2?w=1400&h=700&fit=crop',
    'https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?w=1400&h=700&fit=crop',
    'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=1400&h=700&fit=crop',
    'https://images.unsplash.com/photo-1468436139062-f60a71c5c892?w=1400&h=700&fit=crop',
  ];

  currentHeroImage = '';
  private heroImageInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private seoService: SeoService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.seoService.setPage(PAGE_SEO['home']);
    this.loadCategories();
    if (this.isBrowser) {
      this.startHeroImageRotation();
    }
  }

  ngOnDestroy(): void {
    this.clearHeroInterval();
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  loadCategories(): void {
    this.isLoading = true;
    this.error = null;

    this.apiService.getCategories().subscribe({
      next: (categories: Category[]) => {
        this.featuredCategories = categories.map(cat => ({
          ...cat,
          icon:  this.getCategoryIcon(cat.name),
          key:   cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          count: 0,
        }));
        this.loadProductCounts();
      },
      error: () => {
        this.error = 'Failed to load categories. Please try again later.';
        this.isLoading = false;
        this.featuredCategories = this.getDefaultCategories();
      },
    });
  }

  private loadProductCounts(): void {
    let settled = 0;
    const total = this.featuredCategories.length;

    if (total === 0) { this.isLoading = false; return; }

    this.featuredCategories.forEach((cat, index) => {
      this.apiService
        .getProductCountByCategory(cat.category_id.toString())
        .pipe(finalize(() => { if (++settled >= total) this.isLoading = false; }))
        .subscribe({
          next:  res  => { this.featuredCategories[index].count = res.data?.product_count ?? 0; },
          error: ()   => { this.featuredCategories[index].count = 0; },
        });
    });
  }

  selectCategory(category: Category): void {
    this.router.navigate(['/categories', category.name]);
  }

  // ── Hero CTA ───────────────────────────────────────────────────────────────

  onShopNow(): void {
    this.router.navigate(['/shop']);
  }

  onBrowseDeals(): void {
    this.router.navigate(['/deals']);
  }

  // ── Hero image rotation ────────────────────────────────────────────────────

  startHeroImageRotation(): void {
    this.currentHeroImage = this.heroImages[0];
    this.heroImageInterval = setInterval(() => this.nextHeroImage(), 5000);
  }

  nextHeroImage(): void {
    const i = this.heroImages.indexOf(this.currentHeroImage);
    this.currentHeroImage = this.heroImages[(i + 1) % this.heroImages.length];
    this.resetHeroInterval();
  }

  previousHeroImage(): void {
    const i = this.heroImages.indexOf(this.currentHeroImage);
    this.currentHeroImage =
      this.heroImages[(i - 1 + this.heroImages.length) % this.heroImages.length];
    this.resetHeroInterval();
  }

  setHeroImage(imageUrl: string): void {
    this.currentHeroImage = imageUrl;
    this.resetHeroInterval();
  }

  private resetHeroInterval(): void {
    this.clearHeroInterval();
    if (this.isBrowser) {
      this.heroImageInterval = setInterval(() => this.nextHeroImage(), 5000);
    }
  }

  private clearHeroInterval(): void {
    if (this.heroImageInterval) {
      clearInterval(this.heroImageInterval);
      this.heroImageInterval = null;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private getCategoryIcon(name: string): string {
    const map: Record<string, string> = {
      'Phones':          '📱',
      'Laptops':         '💻',
      'Accessories':     '🎧',
      'Home Appliances': '🏠',
      'Gaming':          '🎮',
      'Audio & Sound':   '🔊',
      'Computers':       '🖥️',
      'Tablets':         '📱',
      'Cameras':         '📷',
    };
    return map[name] ?? '🛍️';
  }

  private getDefaultCategories(): Category[] {
    return [
      { name: 'Phones',          icon: '📱', count: 0, key: 'phones',          category_id: 1, description: '', featured: true, icon_path: '', created_at: '' },
      { name: 'Laptops',         icon: '💻', count: 0, key: 'laptops',         category_id: 2, description: '', featured: true, icon_path: '', created_at: '' },
      { name: 'Accessories',     icon: '🎧', count: 0, key: 'accessories',     category_id: 3, description: '', featured: true, icon_path: '', created_at: '' },
      { name: 'Home Appliances & Electronics', icon: '🏠', count: 0, key: 'home-appliances', category_id: 4, description: '', featured: true, icon_path: '', created_at: '' },
      { name: 'Gaming',          icon: '🎮', count: 0, key: 'gaming',          category_id: 5, description: '', featured: true, icon_path: '', created_at: '' },
      { name: 'Audio & Sound',   icon: '🔊', count: 0, key: 'audio-sound',     category_id: 6, description: '', featured: true, icon_path: '', created_at: '' },
    ];
  }
}
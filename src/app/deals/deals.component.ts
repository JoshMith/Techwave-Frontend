// deals.component.ts
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, OnDestroy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { Observable, catchError, forkJoin, map, of, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { CartService } from '../services/cart.service';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';

interface Product {
  product_id: number;
  title: string;
  description: string;
  price: number;
  sale_price: number | null;
  stock: number;
  specs: any;
  rating: number;
  review_count: number;
  category_name: string;
  images: ProductImage[];
  discount_percentage?: number;
}

interface ProductImage {
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}

interface SpecialOffer {
  offer_id: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_percent: number | null;
  banner_image_url: string | null;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

interface Deal {
  id: string;
  title: string;
  description: string;
  discount: number;
  discount_type: string;
  expiration: string;
  category?: string;
  products?: number;
  image: string;
  banner_image_url: string | null;
  product_ids?: number[];
}

@Component({
  selector: 'app-deals',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './deals.component.html',
  styleUrl: './deals.component.css'
})
export class DealsComponent implements OnInit, OnDestroy {
  private cartSubscription?: Subscription;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private cartService: CartService,
    @Inject(PLATFORM_ID) private platformId: any
  ) { }

  // Products data
  allProducts: Product[] = [];
  loading = true;
  errorMessage: string | null = null;

  // Deals data from special offers
  allSpecialOffers: SpecialOffer[] = [];
  featuredDeals: Deal[] = [];
  activeDeals: Deal[] = [];
  expiringDeals: Deal[] = [];

  // Categories for filtering
  categories = [
    { name: 'All Deals', icon: '🔥', count: 0 },
    { name: 'Phones', icon: '📱', count: 0 },
    { name: 'Laptops', icon: '💻', count: 0 },
    { name: 'Accessories', icon: '🎧', count: 0 },
    { name: 'Home Appliances', icon: '🏠', count: 0 },
    { name: 'Gaming', icon: '🎮', count: 0 },
    { name: 'Audio & Sound', icon: '🔊', count: 0 }
  ];

  selectedCategory = 'All Deals';
  cartCount = 0;

  // Countdown timer
  countdownInterval: any;
  countdown = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  };

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadSpecialOffers();
      this.subscribeToCart();
      this.startCountdown();
    }
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  /**
   * Subscribe to cart state for live updates
   */
  private subscribeToCart(): void {
    this.cartSubscription = this.cartService.cartState$.subscribe(state => {
      this.cartCount = state.item_count;
    });

    // Initialize cart
    this.cartService.initializeCart();
  }

  /**
   * Start countdown timer to next expiring offer
   */
  private startCountdown(): void {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  private updateCountdown(): void {
    // Find the soonest expiring active offer
    const activeOffers = this.allSpecialOffers.filter(
      offer => offer.is_active && new Date(offer.valid_until) > new Date()
    );
    
    if (activeOffers.length === 0) {
      // Default countdown if no offers
      this.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return;
    }
    
    const soonestExpiry = Math.min(
      ...activeOffers.map(offer => new Date(offer.valid_until).getTime())
    );
    const now = new Date().getTime();
    const diff = soonestExpiry - now;
    
    if (diff <= 0) {
      this.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return;
    }
    
    this.countdown = {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    };
  }

  /**
   * Load special offers from API
   */
  private loadSpecialOffers(): void {
    this.loading = true;
    this.errorMessage = null;

    this.apiService.getSpecialOffers().subscribe({
      next: (response: any) => {
        // Handle different response formats
        let offers: SpecialOffer[] = [];
        if (Array.isArray(response)) {
          offers = response;
        } else if (response?.data && Array.isArray(response.data)) {
          offers = response.data;
        } else if (response?.offers && Array.isArray(response.offers)) {
          offers = response.offers;
        }

        this.allSpecialOffers = offers.filter(offer => offer.is_active);
        
        console.log('✅ Loaded special offers:', this.allSpecialOffers.length);
        
        if (this.allSpecialOffers.length === 0) {
          this.loading = false;
          this.errorMessage = 'No active special offers at the moment. Check back soon!';
          return;
        }
        
        // Load products to get category info for offers
        this.loadProductsForOffers();
      },
      error: (err) => {
        console.error('Error loading special offers:', err);
        this.errorMessage = 'Failed to load special offers. Please try again later.';
        this.loading = false;
      }
    });
  }

  /**
   * Load products to associate with offers
   */
  private loadProductsForOffers(): void {
    // Load products from all categories to get discount info
    const categoryNames = this.categories
      .filter(cat => cat.name !== 'All Deals')
      .map(cat => cat.name);

    const categoryRequests = categoryNames.map(categoryName =>
      this.apiService.getProductsByCategoryName(categoryName).pipe(
        catchError(error => {
          console.warn(`Failed to load ${categoryName}:`, error);
          return of([]);
        })
      )
    );

    forkJoin(categoryRequests).subscribe({
      next: (results: Product[][]) => {
        this.allProducts = results.flat().map(product => ({
          ...product,
          discount_percentage: this.calculateDiscount(product)
        }));

        console.log('✅ Loaded products for offers:', this.allProducts.length);
        
        // Load images
        this.loadProductImages();
      },
      error: (err) => {
        console.error('Error loading products:', err);
        // Generate deals without products
        this.generateDealsFromSpecialOffers();
        this.loading = false;
      }
    });
  }

  /**
   * Calculate discount percentage
   */
  private calculateDiscount(product: Product): number {
    if (!product.sale_price || product.sale_price >= product.price) {
      return 0;
    }
    return Math.round(((product.price - product.sale_price) / product.price) * 100);
  }

  /**
   * Load images for all products
   */
  private loadProductImages(): void {
    const imageRequests = this.allProducts.map(product =>
      this.apiService.serveProductImagesSafe(product.product_id.toString()).pipe(
        map(imagesResponse => ({
          ...product,
          images: this.processImages(imagesResponse)
        })),
        catchError(error => {
          console.warn(`Failed to load images for product ${product.product_id}:`, error);
          return of({ ...product, images: [] });
        })
      )
    );

    if (imageRequests.length > 0) {
      forkJoin(imageRequests).subscribe({
        next: (productsWithImages: Product[]) => {
          this.allProducts = productsWithImages;
          this.generateDealsFromSpecialOffers();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading images:', err);
          this.generateDealsFromSpecialOffers();
          this.loading = false;
        }
      });
    } else {
      this.generateDealsFromSpecialOffers();
      this.loading = false;
    }
  }

  private processImages(imagesResponse: any): ProductImage[] {
    let images: any[] = [];

    if (Array.isArray(imagesResponse)) {
      images = imagesResponse;
    } else if (imagesResponse?.images && Array.isArray(imagesResponse.images)) {
      images = imagesResponse.images;
    }

    if (!images || images.length === 0) {
      return [];
    }

    return images.map(img => ({
      image_url: this.ensureAbsoluteUrl(img.full_url || img.image_url),
      alt_text: img.alt_text || 'Product image',
      is_primary: img.is_primary || false
    }));
  }

  private ensureAbsoluteUrl(url: string): string {
    if (!url) return this.getFallbackImage();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const apiBaseUrl = this.apiService.getApiBaseUrl();
    return `${apiBaseUrl}/${cleanUrl}`;
  }

  getProductImage(product: Product): string | null {
    if (!product.images || product.images.length === 0) {
      return null;
    }
    const image = product.images.find(img => img.is_primary) || product.images[0];
    return image ? this.ensureAbsoluteUrl(image.image_url) : null;
  }

  private getFallbackImage(): string {
    return '/images/product-placeholder.jpg';
  }

  onImageError(event: any): void {
    event.target.src = this.getFallbackImage();
  }

  /**
   * Generate deals from special offers
   */
  private generateDealsFromSpecialOffers(): void {
    const now = new Date();
    
    // Process each special offer
    const deals: Deal[] = this.allSpecialOffers.map(offer => {
      const validUntil = new Date(offer.valid_until);
      const isExpiringSoon = (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 3;
      
      // Find products that could be part of this offer (if applicable)
      const relatedProducts = this.allProducts.filter(p => 
        p.discount_percentage && p.discount_percentage > 0
      );
      
      return {
        id: offer.offer_id,
        title: offer.title,
        description: offer.description || `Get ${offer.discount_value}% off on selected items!`,
        discount: offer.discount_value,
        discount_type: offer.discount_type,
        expiration: offer.valid_until,
        image: offer.banner_image_url || this.getRandomCategoryEmoji(),
        banner_image_url: offer.banner_image_url,
        products: relatedProducts.length,
        product_ids: relatedProducts.slice(0, 5).map(p => p.product_id)
      };
    });
    
    // Sort by discount value (highest first)
    const sortedDeals = [...deals].sort((a, b) => b.discount - a.discount);
    
    // Featured deals: top 2 highest discounts
    this.featuredDeals = sortedDeals.slice(0, 2);
    
    // Active deals: all active offers
    this.activeDeals = deals;
    
    // Expiring deals: offers ending within 3 days
    const now_time = new Date();
    this.expiringDeals = deals.filter(deal => {
      const expDate = new Date(deal.expiration);
      const daysRemaining = (expDate.getTime() - now_time.getTime()) / (1000 * 60 * 60 * 24);
      return daysRemaining <= 3 && daysRemaining > 0;
    });
    
    // Update category counts
    this.updateCategoryCounts();
    
    console.log('✅ Deals generated from special offers:', {
      total: this.activeDeals.length,
      featured: this.featuredDeals.length,
      expiring: this.expiringDeals.length
    });
  }

  /**
   * Get random emoji for fallback
   */
  private getRandomCategoryEmoji(): string {
    const emojis = ['🔥', '🎉', '💎', '⚡', '🎁', '🏷️', '💰'];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  /**
   * Get emoji for category
   */
  private getCategoryEmoji(category: string): string {
    const cat = this.categories.find(c => c.name === category);
    return cat?.icon || '🎁';
  }

  /**
   * Update category counts
   */
  private updateCategoryCounts(): void {
    // For now, just set total count
    this.categories = this.categories.map(category => {
      if (category.name === 'All Deals') {
        return { ...category, count: this.activeDeals.length };
      }
      return { ...category, count: Math.floor(this.activeDeals.length / 3) };
    });
  }

  // Filter deals by category
  filterDeals(category: string): void {
    this.selectedCategory = category;
  }

  // Get filtered deals based on selection
  get filteredDeals(): Deal[] {
    if (this.selectedCategory === 'All Deals') {
      return [...this.activeDeals];
    }
    // For now, return all deals since we don't have category mapping
    return [...this.activeDeals];
  }

  // Calculate days remaining for a deal
  daysRemaining(expiration: string): number {
    const expDate = new Date(expiration);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  onSearch(): void {
    alert('Search functionality coming soon!');
  }

  onCategoryClick(category: string): void {
    this.router.navigate([`/categories/${category.toLowerCase().replace(' ', '-')}`]);
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  /**
   * Navigate to deal products
   */
  viewDealCategory(deal: Deal): void {
    if (deal.product_ids && deal.product_ids.length > 0) {
      this.router.navigate(['/shop'], {
        queryParams: { offer: deal.id }
      });
    } else {
      this.router.navigate(['/shop']);
    }
  }

  /**
   * Shop now button
   */
  shopNow(): void {
    this.router.navigate(['/shop']);
  }
}
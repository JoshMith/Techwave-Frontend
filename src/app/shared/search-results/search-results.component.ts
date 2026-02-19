// ============================================
// search-results.component.ts
// ============================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, Subscription, catchError, forkJoin, map, of, takeUntil } from 'rxjs';
import { SearchService, SearchFilters, SearchResult } from '../../services/search.service';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { HeaderComponent } from '../../shared/header/header.component';
import { FooterComponent } from '../../shared/footer/footer.component';

interface ProductImage {
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.css']
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  Math = Math;

  // Results state
  products: any[] = [];
  loading = false;
  loadingImages = false;
  errorMessage: string | null = null;

  // Pagination
  currentPage = 1;
  totalPages = 0;
  total = 0;
  limit = 12;

  // Filters
  searchQuery = '';
  selectedCategory = '';
  selectedBrand = '';
  selectedSort = 'relevance';
  priceRange = { min: 0, max: 500000 };

  // Filter options (loaded from products)
  availableCategories: string[] = [];
  availableBrands: string[] = [];

  sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'popularity', label: 'Popularity' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'newest', label: 'Newest First' }
  ];

  // Cart
  cartCount = 0;
  addingToCart = false;
  private cartSubscription?: Subscription;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private searchService: SearchService,
    private apiService: ApiService,
    private cartService: CartService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.cartSubscription = this.cartService.cartState$.subscribe(state => {
      this.cartCount = state.item_count;
    });

    // Load categories for filter dropdown
    this.loadFilterOptions();

    // React to URL query param changes
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.searchQuery = params['q'] || '';
        this.selectedCategory = params['category'] || '';
        this.selectedBrand = params['brand'] || '';
        this.selectedSort = params['sort'] || 'relevance';
        this.currentPage = parseInt(params['page'] || '1');
        if (params['minPrice']) this.priceRange.min = parseInt(params['minPrice']);
        if (params['maxPrice']) this.priceRange.max = parseInt(params['maxPrice']);
        
        this.doSearch();
      });
  }

  ngOnDestroy(): void {
    this.cartSubscription?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFilterOptions(): void {
    this.apiService.getCategories().subscribe({
      next: (categories: any[]) => {
        this.availableCategories = categories.map(c => c.name).sort();
      },
      error: () => {}
    });
  }

  doSearch(): void {
    if (!this.searchQuery.trim()) {
      this.products = [];
      this.total = 0;
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    const filters: SearchFilters = {
      q: this.searchQuery,
      category: this.selectedCategory,
      brand: this.selectedBrand,
      sort: this.selectedSort,
      page: this.currentPage,
      limit: this.limit,
      minPrice: this.priceRange.min > 0 ? this.priceRange.min : undefined,
      maxPrice: this.priceRange.max < 500000 ? this.priceRange.max : undefined
    };

    this.searchService.searchProducts(filters).subscribe({
      next: (result) => {
        this.total = result.pagination.total;
        this.totalPages = result.pagination.totalPages;
        this.loading = false;
        this.loadImages(result.products);
      },
      error: (err) => {
        console.error('Search error:', err);
        this.errorMessage = 'Search failed. Please try again.';
        this.loading = false;
      }
    });
  }

  private loadImages(products: any[]): void {
    if (!products.length) {
      this.products = [];
      return;
    }

    this.loadingImages = true;
    const imageRequests = products.map(product =>
      this.apiService.serveProductImagesSafe(product.product_id.toString()).pipe(
        map(imagesResponse => ({
          ...product,
          images: this.processImages(imagesResponse)
        })),
        catchError(() => of({ ...product, images: [] }))
      )
    );

    forkJoin(imageRequests).subscribe({
      next: (productsWithImages) => {
        this.products = productsWithImages;
        this.loadingImages = false;

        // Extract brands from results
        const brands = new Set(
          productsWithImages
            .map((p: any) => p.specs?.brand)
            .filter(Boolean)
        );
        this.availableBrands = Array.from(brands).sort() as string[];
      },
      error: () => {
        this.products = products.map(p => ({ ...p, images: [] }));
        this.loadingImages = false;
      }
    });
  }

  private processImages(imagesResponse: any): ProductImage[] {
    let images: any[] = [];
    if (Array.isArray(imagesResponse)) images = imagesResponse;
    else if (imagesResponse?.images) images = imagesResponse.images;
    if (!images.length) return [];

    return images.map(img => ({
      image_url: this.ensureAbsoluteUrl(img.full_url || img.image_url),
      alt_text: img.alt_text || 'Product image',
      is_primary: img.is_primary || false
    }));
  }

  private ensureAbsoluteUrl(url: string): string {
    if (!url) return '/images/product-placeholder.jpg';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    return `${this.apiService.getApiBaseUrl()}/${cleanUrl}`;
  }

  getProductImage(product: any): string {
    if (!product.images?.length) return '/images/product-placeholder.jpg';
    const img = product.images.find((i: any) => i.is_primary) || product.images[0];
    return img?.image_url || '/images/product-placeholder.jpg';
  }

  onImageError(event: any): void {
    event.target.src = '/images/product-placeholder.jpg';
  }

  formatSpecs(specs: any): string {
    if (!specs) return '';
    const parts = [];
    if (specs.brand) parts.push(specs.brand);
    if (specs.processor) parts.push(specs.processor);
    if (specs.ram) parts.push(specs.ram);
    if (specs.storage) parts.push(specs.storage);
    if (specs.type) parts.push(specs.type);
    return parts.slice(0, 3).join(' • ');
  }

  // Filter & sort actions — update URL so results are shareable/bookmarkable
  applySearch(): void {
    this.currentPage = 1;
    this.updateUrl();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.updateUrl();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.updateUrl();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateUrl();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private updateUrl(): void {
    const queryParams: any = { q: this.searchQuery, page: this.currentPage };
    if (this.selectedCategory) queryParams['category'] = this.selectedCategory;
    if (this.selectedBrand) queryParams['brand'] = this.selectedBrand;
    if (this.selectedSort !== 'relevance') queryParams['sort'] = this.selectedSort;
    if (this.priceRange.min > 0) queryParams['minPrice'] = this.priceRange.min;
    if (this.priceRange.max < 500000) queryParams['maxPrice'] = this.priceRange.max;

    this.router.navigate(['/search'], { queryParams });
  }

  resetFilters(): void {
    this.selectedCategory = '';
    this.selectedBrand = '';
    this.selectedSort = 'relevance';
    this.priceRange = { min: 0, max: 500000 };
    this.currentPage = 1;
    this.updateUrl();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  addToCart(product: any): void {
    if (this.addingToCart || product.stock < 1) return;
    this.addingToCart = true;

    this.cartService.addToCart(product.product_id, 1).subscribe({
      next: (response) => {
        this.addingToCart = false;
        alert(response.message === 'Cart item quantity updated'
          ? `${product.title} quantity updated!`
          : `${product.title} added to cart!`
        );
      },
      error: (err) => {
        this.addingToCart = false;
        alert(err.error?.message || 'Failed to add to cart');
      }
    });
  }

  viewProductDetails(product: any): void {
    this.productService.setSelectedProduct(product);
    this.router.navigate(['/product', product.product_id], {
      queryParams: { returnUrl: this.router.url }
    });
  }
}
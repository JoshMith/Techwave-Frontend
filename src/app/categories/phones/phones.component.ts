import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, map, switchMap, Subscription, catchError, of } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { HeaderComponent } from '../../shared/header/header.component';
import { FooterComponent } from '../../shared/footer/footer.component';

interface Product {
  product_id: number;
  title: string;
  description: string;
  price: number;
  sale_price: number | null;
  stock: number;
  specs: {
    brand: string;
    storage?: number;
    ram?: any;
    has5G?: boolean;
    [key: string]: any;
  };
  rating: number;
  review_count: number;
  category_id: number;
  seller_id: number;
  images: ProductImage[];
}

interface ProductImage {
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}

interface Filters {
  priceRange: {
    min: number;
    max: number;
  };
  brands: string[];
  features: {
    has5G: boolean;
    has128GB: boolean;
    has8GBRAM: boolean;
  };
}

@Component({
  selector: 'app-phones',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './phones.component.html',
  styleUrls: ['./phones.component.css'],
})
export class PhonesComponent implements OnInit {
  Math = Math;

  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  paginatedProducts: Product[] = [];
  loading = true;

  currentPage = 1;
  itemsPerPage = 6;
  totalPages = 0;

  filters: Filters = {
    priceRange: { min: 5000, max: 200000 },
    brands: [],
    features: { has5G: false, has128GB: false, has8GBRAM: false },
  };

  errorMessage: string | null = null;

  availableBrands: string[] = [];
  sortBy = 'popularity';

  cartCount = 0;
  addingToCart = false;
  private cartSubscription?: Subscription;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private cartService: CartService,
    private productService: ProductService,
    @Inject(PLATFORM_ID) private platformId: any,
  ) {}

  ngOnInit(): void {
    // Subscribe to cart state
    this.cartSubscription = this.cartService.cartState$.subscribe((state) => {
      this.cartCount = state.item_count;
    });

    this.loadProducts();
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  addToCart(product: Product): void {
    if (this.addingToCart) return;

    if (product.stock < 1) {
      alert('This product is out of stock.');
      return;
    }

    this.addingToCart = true;

    this.cartService.addToCart(product.product_id, 1).subscribe({
      next: (response) => {
        this.addingToCart = false;
        const message =
          response.message === 'Cart item quantity updated'
            ? `${product.title} quantity updated in cart!`
            : `${product.title} added to cart!`;
        alert(message);
      },
      error: (err) => {
        this.addingToCart = false;
        const errorMessage = err.error?.message || 'Failed to add item to cart';
        alert(errorMessage);
      },
    });
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  // Rest of your existing methods remain the same...
  private loadProducts(): void {
    this.loading = true;
    this.errorMessage = null;

    this.apiService.getProductsByCategoryName('Phones').subscribe({
      next: (products: Product[]) => {
        // Store products first
        this.allProducts = products;
        this.extractAvailableBrands();

        // Create image requests for all products with individual error handling
        const imageRequests = products.map((product) =>
          this.apiService
            .serveProductImagesSafe(product.product_id.toString())
            .pipe(
              map((imagesResponse) => ({
                ...product,
                images: this.processImages(imagesResponse),
              })),
              catchError((error) => {
                console.warn(
                  `Failed to load images for product ${product.product_id}:`,
                  error,
                );
                return of({
                  ...product,
                  images: [],
                });
              }),
            ),
        );

        // Wait for all image requests (or their fallbacks)
        if (imageRequests.length > 0) {
          forkJoin(imageRequests).subscribe({
            next: (productsWithImages: Product[]) => {
              this.allProducts = productsWithImages;
              this.applyFilters();
              this.loading = false;
            },
            error: (err) => {
              // This should rarely happen due to individual catchError above
              console.error('Unexpected error in image loading:', err);
              this.allProducts = products.map((p) => ({ ...p, images: [] }));
              this.applyFilters();
              this.loading = false;
            },
          });
        } else {
          // No products, just finish loading
          this.applyFilters();
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('Error loading products:', err);
        this.errorMessage = 'Failed to load products. Please try again later.';
        this.loading = false;
      },
    });
  }

  private processImages(imagesResponse: any): ProductImage[] {
    // Handle different response formats
    let images: any[] = [];

    if (Array.isArray(imagesResponse)) {
      images = imagesResponse;
    } else if (imagesResponse?.images && Array.isArray(imagesResponse.images)) {
      images = imagesResponse.images;
    }

    if (!images || images.length === 0) {
      return [];
    }

    return images.map((img) => {
      // Use full_url if available, otherwise construct from image_url
      const imageUrl = img.full_url || img.image_url;

      return {
        image_url: this.ensureAbsoluteUrl(imageUrl),
        alt_text: img.alt_text || 'Product image',
        is_primary: img.is_primary || false,
      };
    });
  }

  private ensureAbsoluteUrl(url: string): string {
    if (!url) return this.getFallbackImage();

    // If already absolute, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Remove leading slash if present
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;

    // Construct absolute URL
    const apiBaseUrl = this.apiService.getApiBaseUrl();
    return `${apiBaseUrl}/${cleanUrl}`;
  }

  getProductImage(product: Product): string {
    if (!product.images || product.images.length === 0) {
      return this.getFallbackImage();
    }
    const image =
      product.images.find((img) => img.is_primary) || product.images[0];
    return image
      ? this.ensureAbsoluteUrl(image.image_url)
      : this.getFallbackImage();
  }

  private getFallbackImage(): string {
    return '/images/phone-placeholder.jpg';
  }

  onImageError(event: any): void {
    event.target.src = this.getFallbackImage();
  }

  private extractAvailableBrands(): void {
    const brands = new Set(
      this.allProducts
        .map((product) => product.specs.brand)
        .filter((brand) => brand),
    );
    this.availableBrands = Array.from(brands).sort() as string[];
  }

  onPriceChange(): void {
    if (this.filters.priceRange.min > this.filters.priceRange.max) {
      this.filters.priceRange.min = this.filters.priceRange.max;
    }
    this.applyFilters();
  }

  onBrandChange(brand: string, event: any): void {
    if (event.target.checked) {
      if (!this.filters.brands.includes(brand)) {
        this.filters.brands.push(brand);
      }
    } else {
      const index = this.filters.brands.indexOf(brand);
      if (index > -1) {
        this.filters.brands.splice(index, 1);
      }
    }
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredProducts = this.allProducts.filter((product) => {
      const price = product.sale_price || product.price;

      if (
        price < this.filters.priceRange.min ||
        price > this.filters.priceRange.max
      ) {
        return false;
      }

      if (
        this.filters.brands.length > 0 &&
        (!product.specs.brand ||
          !this.filters.brands.includes(product.specs.brand))
      ) {
        return false;
      }

      if (this.filters.features.has5G && !product.specs.has5G) {
        return false;
      }

      if (
        this.filters.features.has128GB &&
        (!product.specs.storage || product.specs.storage < 128)
      ) {
        return false;
      }

      if (
        this.filters.features.has8GBRAM &&
        (!product.specs.ram || product.specs.ram < 8)
      ) {
        return false;
      }

      return true;
    });

    this.sortProducts();
    this.currentPage = 1;
    this.updatePagination();
  }

  resetFilters(): void {
    this.filters = {
      priceRange: { min: 5000, max: 200000 },
      brands: [],
      features: { has5G: false, has128GB: false, has8GBRAM: false },
    };
    this.applyFilters();
  }

  onSortChange(): void {
    this.sortProducts();
    this.updatePagination();
  }

  private sortProducts(): void {
    switch (this.sortBy) {
      case 'price-low':
        this.filteredProducts.sort(
          (a, b) => (a.sale_price || a.price) - (b.sale_price || b.price),
        );
        break;
      case 'price-high':
        this.filteredProducts.sort(
          (a, b) => (b.sale_price || b.price) - (a.sale_price || a.price),
        );
        break;
      case 'rating':
        this.filteredProducts.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        this.filteredProducts.sort((a, b) => b.product_id - a.product_id);
        break;
      case 'popularity':
      default:
        this.filteredProducts.sort((a, b) => b.review_count - a.review_count);
        break;
    }
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(
      this.filteredProducts.length / this.itemsPerPage,
    );
    this.updatePaginatedProducts();
  }

  private updatePaginatedProducts(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProducts = this.filteredProducts.slice(startIndex, endIndex);
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedProducts();
    }
  }

  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (this.currentPage > 3) {
        pages.push('...');
      }
      const start = Math.max(2, this.currentPage - 1);
      const end = Math.min(this.totalPages - 1, this.currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== this.totalPages) {
          pages.push(i);
        }
      }
      if (this.currentPage < this.totalPages - 2) {
        pages.push('...');
      }
      if (this.totalPages > 1) {
        pages.push(this.totalPages);
      }
    }
    return pages;
  }

  onSearch(): void {
    alert('Search functionality is not implemented yet.');
  }

  onCategoryClick(category: string): void {
    this.router.navigate([`/categories/${category.toLowerCase()}`]);
  }

  getDisplayPrice(product: Product): number {
    return product.sale_price || product.price;
  }

  getProductSpecs(product: Product): string {
    const specs = product.specs;
    const parts = [];
    if (specs.storage) parts.push(`${specs.storage}GB`);
    if (specs.has5G) parts.push('5G');
    if (specs.ram) parts.push(`${specs.ram}GB RAM`);
    return parts.join(', ');
  }

  /**
   * Navigate to product details page
   * @param product - The product to view
   */
  viewProductDetails(product: Product): void {
    this.productService.setSelectedProduct(product);
    this.router.navigate(['/product', product.product_id], {
      queryParams: { returnUrl: this.router.url },
    });
  }
}

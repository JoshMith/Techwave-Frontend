// gaming.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  Observable,
  Subscription,
  catchError,
  forkJoin,
  map,
  of,
  switchMap,
} from 'rxjs';
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
    type?: string;
    platform?: string;
    resolution?: string;
    storage?: any;
    features?: string;
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

@Component({
  selector: 'app-gaming',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './gaming.component.html',
  styleUrls: ['./gaming.component.css'],
})
export class GamingComponent implements OnInit {
  // Products data
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  loading = true;
  errorMessage: string | null = null;

  // Filters
  priceRange = { min: 5000, max: 250000 };
  brands: string[] = [];
  selectedBrands: string[] = [];
  features: string[] = [
    '4K Gaming',
    'VR Ready',
    'Wireless',
    'RGB Lighting',
    'Mechanical Keys',
  ];
  selectedFeatures: string[] = [];

  // Sorting
  sortOptions = [
    { value: 'popularity', label: 'Popularity' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'newest', label: 'Newest First' },
  ];
  selectedSort = 'popularity';

  cartCount = 0;
  addingToCart = false;
  private cartSubscription?: Subscription;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private cartService: CartService,
    private productService: ProductService,
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

  private loadProducts(): void {
    this.loading = true;
    this.errorMessage = null;

    this.apiService.getProductsByCategoryName('Gaming').subscribe({
      next: (products: Product[]) => {
        // Store products first
        this.allProducts = products;
        this.extractBrands();

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

  private extractBrands(): void {
    const brands = new Set(
      this.allProducts
        .map((product) => product.title.split(' ')[0]) // Get first word as brand
        .filter((brand) => brand),
    );
    this.brands = Array.from(brands).sort() as string[];
  }

  // Filter methods
  toggleBrand(brand: string): void {
    const index = this.selectedBrands.indexOf(brand);
    if (index > -1) {
      this.selectedBrands.splice(index, 1);
    } else {
      this.selectedBrands.push(brand);
    }
    this.applyFilters();
  }

  toggleFeature(feature: string): void {
    const index = this.selectedFeatures.indexOf(feature);
    if (index > -1) {
      this.selectedFeatures.splice(index, 1);
    } else {
      this.selectedFeatures.push(feature);
    }
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredProducts = this.allProducts.filter((product) => {
      const price = product.sale_price || product.price;

      // Price filter - only filter by price if the range is valid
      if (this.priceRange.min !== 5000 || this.priceRange.max !== 250000) {
        if (price < this.priceRange.min || price > this.priceRange.max) {
          return false;
        }
      }

      // Brand filter - only apply if brands are selected
      if (this.selectedBrands.length > 0) {
        const productBrand = product.title.split(' ')[0];
        if (!this.selectedBrands.includes(productBrand)) {
          return false;
        }
      }

      // Feature filter - only apply if features are selected
      if (this.selectedFeatures.length > 0) {
        const productFeatures = product.specs.features || '';
        const hasMatchingFeature = this.selectedFeatures.some((feature) =>
          productFeatures.toLowerCase().includes(feature.toLowerCase()),
        );
        if (!hasMatchingFeature) return false;
      }

      // Don't filter out products based on image availability
      return true;
    });

    this.sortProducts();
  }

  resetFilters(): void {
    this.priceRange = { min: 5000, max: 250000 };
    this.selectedBrands = [];
    this.selectedFeatures = [];
    this.selectedSort = 'popularity';
    this.applyFilters();
  }

  private sortProducts(): void {
    switch (this.selectedSort) {
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

  // Product display methods
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
    return '/images/gaming-placeholder.jpg';
  }

  onImageError(event: any): void {
    event.target.src = this.getFallbackImage();
  }

  formatSpecs(specs: any): string {
    const parts = [];
    if (specs.platform) parts.push(specs.platform);
    if (specs.type) parts.push(specs.type);
    if (specs.resolution) parts.push(specs.resolution);
    if (specs.storage) parts.push(specs.storage);
    if (specs.features) parts.push(specs.features);
    return parts.join(' • ');
  }

  getDiscountedPrice(price: number, discount?: number): number {
    if (!discount) return price;
    return price - (price * discount) / 100;
  }

  // Navigation methods
  onCategoryClick(category: string): void {
    this.router.navigate([
      `/categories/${category.toLowerCase().replace(' ', '-')}`,
    ]);
  }

  onSearch(): void {
    alert('Search functionality is not implemented yet.');
  }
  viewProductDetails(product: Product): void {
    this.productService.setSelectedProduct(product);
    this.router.navigate(['/product', product.product_id], {
      queryParams: { returnUrl: this.router.url },
    });
  }
}

import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
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
    brand: string;
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
  selector: 'app-accessories',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './accessories.component.html',
  styleUrls: ['./accessories.component.css'],
})
export class AccessoriesComponent implements OnInit, OnDestroy {
  // Products data
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  loading = true;
  errorMessage: string | null = null;

  // Filters
  priceRange = { min: 500, max: 50000 };
  brands: string[] = [];
  selectedBrands: string[] = [];
  accessoryTypes = [
    'Cases',
    'Chargers',
    'Headphones',
    'Screen Protectors',
    'Stands',
  ];
  selectedTypes: string[] = [];

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

  // Mobile menu state
  mobileMenuOpen = false;
  activeDropdown: string | null = null;

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

    this.apiService.getProductsByCategoryName('Accessories').subscribe({
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
        .map((product) => product.specs.brand)
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

  toggleType(type: string): void {
    const index = this.selectedTypes.indexOf(type);
    if (index > -1) {
      this.selectedTypes.splice(index, 1);
    } else {
      this.selectedTypes.push(type);
    }
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredProducts = this.allProducts.filter((product) => {
      const price = product.sale_price || product.price;

      // Price filter
      if (price < this.priceRange.min || price > this.priceRange.max) {
        return false;
      }

      // Brand filter
      if (
        this.selectedBrands.length > 0 &&
        (!product.specs.brand ||
          !this.selectedBrands.includes(product.specs.brand))
      ) {
        return false;
      }

      // Type filter
      if (this.selectedTypes.length > 0) {
        const productType = product.specs || '';
        // if (!this.selectedTypes.some(type => productType.toLowerCase().includes(type.toLowerCase()))) {
        return false;
      }

      return true;
    });

    this.sortProducts();
  }

  resetFilters(): void {
    this.priceRange = { min: 500, max: 50000 };
    this.selectedBrands = [];
    this.selectedTypes = [];
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
    return '/images/accessory-placeholder.jpg';
  }

  onImageError(event: any): void {
    event.target.src = this.getFallbackImage();
  }

  formatSpecs(specs: any): string {
    // Skip these known properties that we handle separately
    const skipProperties = ['brand', 'type', 'color', 'compatibility'];

    const parts = [];

    // First add the standard properties if they exist
    if (specs.brand) parts.push(specs.brand);
    if (specs.type) parts.push(specs.type);
    if (specs.color) parts.push(specs.color);
    if (specs.compatibility) parts.push(`For ${specs.compatibility}`);

    // Then add all other properties dynamically
    for (const key in specs) {
      if (
        specs.hasOwnProperty(key) &&
        !skipProperties.includes(key) &&
        specs[key] !== null &&
        specs[key] !== undefined &&
        specs[key] !== ''
      ) {
        parts.push(`${key}: ${specs[key]}`);
      }
    }

    return parts.join(' • ');
  }

  getDiscountedPrice(
    price: number,
    salePrice: number | null | undefined,
  ): number {
    return salePrice !== null && salePrice !== undefined ? salePrice : price;
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

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;

    // Prevent body scroll when menu is open
    if (this.mobileMenuOpen) {
      document.body.classList.add('mobile-menu-active');
    } else {
      document.body.classList.remove('mobile-menu-active');
      this.activeDropdown = null; // Close any open dropdowns
    }
  }

  /**
   * Close mobile menu
   */
  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    document.body.classList.remove('mobile-menu-active');
    this.activeDropdown = null;
  }

  /**
   * Toggle dropdown in mobile menu
   */
  toggleMobileDropdown(dropdownName: string): void {
    if (this.activeDropdown === dropdownName) {
      this.activeDropdown = null;
    } else {
      this.activeDropdown = dropdownName;
    }
  }

  /**
   * Check if dropdown is open
   */
  isDropdownOpen(dropdownName: string): boolean {
    return this.activeDropdown === dropdownName;
  }

  /**
   * Close menu when clicking outside on desktop
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Don't close if clicking inside nav or on hamburger
    if (target.closest('.nav-items') || target.closest('.hamburger-menu')) {
      return;
    }

    // Close mobile menu if open
    if (this.mobileMenuOpen && window.innerWidth <= 768) {
      this.closeMobileMenu();
    }
  }

  /**
   * Close menu on route change (add to your navigation links)
   */
  onNavigate(): void {
    if (window.innerWidth <= 768) {
      this.closeMobileMenu();
    }
  }

  /**
   * Handle window resize
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    // Close mobile menu when resizing to desktop
    if (event.target.innerWidth > 768 && this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  /**
   * Check if we're on mobile
   */
  isMobile(): boolean {
    return window.innerWidth <= 768;
  }
}

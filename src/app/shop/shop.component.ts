// ============================================
// shop.component.ts (FIXED - With Category Filtering)
// ============================================
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, RouterLink } from '@angular/router';
import { Subscription, catchError, forkJoin, map, of } from 'rxjs';
import { ApiService } from '../services/api.service';
import { CartService } from '../services/cart.service';
import { ProductService } from '../services/product.service';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';

interface Product {
  product_id: number;
  title: string;
  description: string;
  price: number;
  sale_price: number | null;
  stock: number;
  specs: {
    brand?: string;
    [key: string]: any;
  };
  rating: number;
  review_count: number;
  category_id: number;
  seller_id: number;
  images: ProductImage[];
  category_name?: string;
}

interface ProductImage {
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}

interface SpecialOffer {
  title: string;
  description: string;
  category: string;
  discount: number | null;
}

interface Category {
  category_id: number;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.css'
})
export class ShopComponent implements OnInit, OnDestroy {
  // All products data
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];

  // State variables
  searchQuery: string = '';
  selectedCategory: string = 'all';
  selectedBrand: string = 'all';
  minPrice: number = 0;
  maxPrice: number = 200000;
  sortOption: string = 'featured';
  loading: boolean = true;
  errorMessage: any = '';

  // Filter options
  categories: string[] = ['all'];
  brands: string[] = ['all'];
  sortOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' }
  ];

  // Special offers
  specialOffers: SpecialOffer[] = [];

  // Category mapping (from database)
  private categoryMap: Map<number, string> = new Map();

  // Featured categories with counts
  featuredCategories = [
    { name: 'Phones', icon: '📱', count: 0, category_id: 1 },
    { name: 'Laptops', icon: '💻', count: 0, category_id: 2 },
    { name: 'Accessories', icon: '🎧', count: 0, category_id: 3 },
    { name: 'Home Appliances & Electronics', icon: '🏠', count: 0, category_id: 4 },
    { name: 'Gaming', icon: '🎮', count: 0, category_id: 5 },
    { name: 'Audio & Sound', icon: '🔊', count: 0, category_id: 6 }
  ];

  // Cart
  cartCount = 0;
  addingToCart = false;
  private cartSubscription?: Subscription;

  // For Math.ceil in template
  Math = Math;
  products: Product[] = [];

  constructor(
    private router: Router,
    private apiService: ApiService,
    private cartService: CartService,
    private productService: ProductService,
    @Inject(PLATFORM_ID) private platformId: any
  ) { }

  ngOnInit(): void {
    // Subscribe to cart state
    this.cartSubscription = this.cartService.cartState$.subscribe(state => {
      this.cartCount = state.item_count;
    });

    this.loadCategoryCounts();
    this.loadCategories();
    this.loadSpecialOffers();
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  /**
   * Load categories from API
   */
  private loadCategories(): void {
    this.apiService.getCategories().subscribe({
      next: (categories: Category[]) => {
        // Build category map
        // console.log('Loaded categories:', categories);
        categories.forEach(cat => {
          this.categoryMap.set(cat.category_id, cat.name);
        });

        // Now load products
        this.loadProducts();
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        // Use fallback mapping if API fails
        this.categoryMap.set(1, 'Phones');
        this.categoryMap.set(2, 'Laptops');
        this.categoryMap.set(3, 'Accessories');
        this.categoryMap.set(4, 'Home Appliances');
        this.categoryMap.set(5, 'Gaming');
        this.categoryMap.set(6, 'Audio & Sound');

        this.loadProducts();
      }
    });
  }

  private loadCategoryCounts(): void {
    // Load product counts for each featured category
    this.featuredCategories.forEach((category, index) => {
      this.apiService.getProductsByCategoryName(category.name).pipe(
        catchError(error => {
          console.warn(`Failed to load count for ${category.name}:`, error);
          return of([]);
        })
      ).subscribe({
        next: (products: any) => {
          const count = Array.isArray(products) ? products.length : 0;
          this.featuredCategories[index] = { ...category, count };
        }
      });
    });
  }

  /**
   * Load all products from all categories
   */
  loadProducts(categoryName?: string): void {
    this.loading = true;
    this.errorMessage = null;

    // Load all products or products by category
    const productsObservable = categoryName && categoryName !== 'all'
      ? this.apiService.getProductsByCategoryName(categoryName)
      : this.apiService.getProducts();

    productsObservable.subscribe({
      next: (products: Product[]) => {
        // Store products first
        this.allProducts = products;
        this.products = products;
        this.extractCategoriesAndBrands();

        // Create image requests for all products with individual error handling
        const imageRequests = products.map(product =>
          this.apiService.serveProductImagesSafe(product.product_id.toString()).pipe(
            map(imagesResponse => ({
              ...product,
              images: this.processImages(imagesResponse)
            })),
            catchError(error => {
              console.warn(`Failed to load images for product ${product.product_id}:`, error);
              return of({
                ...product,
                images: []
              });
            })
          )
        );

        // Wait for all image requests (or their fallbacks)
        if (imageRequests.length > 0) {
          forkJoin(imageRequests).subscribe({
            next: (productsWithImages: Product[]) => {
              this.allProducts = productsWithImages;
              this.products = productsWithImages;
              this.applyFilters();
              this.loading = false;
            },
            error: (err) => {
              // This should rarely happen due to individual catchError above
              console.error('Unexpected error in image loading:', err);
              this.allProducts = products.map(p => ({ ...p, images: [] }));
              this.products = products.map(p => ({ ...p, images: [] }));
              this.applyFilters();
              this.loading = false;
            }
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
      }
    });
  }

  /**
   * Load images for all products
   */
  private loadProductImages(): void {
    if (this.allProducts.length === 0) {
      this.loading = false;
      this.applyFilters();
      return;
    }

    const imageRequests = this.allProducts.map(product =>
      this.apiService.serveProductImagesSafe(product.product_id.toString()).pipe(
        map(imagesResponse => ({
          ...product,
          images: this.processImages(imagesResponse)
        })),
        catchError(error => {
          console.warn(`Failed to load images for product ${product.product_id}:`, error);
          return of({
            ...product,
            images: []
          });
        })
      )
    );

    forkJoin(imageRequests).subscribe({
      next: (productsWithImages: Product[]) => {
        this.allProducts = productsWithImages;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading product images:', err);
        this.applyFilters();
        this.loading = false;
      }
    });
  }

  /**
   * Load special offers from API
   */
  private loadSpecialOffers(): void {
    this.apiService.getSpecialOffers().subscribe({
      next: (offersData: any) => {
        this.specialOffers = this.processSpecialOffers(offersData).slice(0, 3);
      },
      error: (err) => {
        console.error('Error loading special offers:', err);
        this.specialOffers = [
          {
            title: '50% Off Selected Items',
            description: 'Premium electronics at unbeatable prices',
            category: 'All',
            discount: 50
          },
          {
            title: 'Free Delivery in Nairobi',
            description: 'On orders over KSh 5,000',
            category: 'All',
            discount: null
          },
          {
            title: 'Weekend Special',
            description: 'Extra 10% off on all laptops',
            category: 'Laptops',
            discount: 10
          }
        ];
      }
    });
  }

  /**
   * Process images from API response
   */
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

    return images.map(img => {
      const imageUrl = img.full_url || img.image_url;
      return {
        image_url: this.ensureAbsoluteUrl(imageUrl),
        alt_text: img.alt_text || 'Product image',
        is_primary: img.is_primary || false
      };
    });
  }

  /**
   * Ensure image URL is absolute
   */
  private ensureAbsoluteUrl(url: string): string {
    if (!url) return this.getFallbackImage();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const apiBaseUrl = this.apiService.getApiBaseUrl();
    return `${apiBaseUrl}/${cleanUrl}`;
  }

  /**
   * Get fallback image
   */
  private getFallbackImage(): string {
    return '/images/product-placeholder.jpg';
  }

  /**
   * Handle image error
   */
  onImageError(event: any): void {
    event.target.src = this.getFallbackImage();
  }

  /**
   * Process special offers from API
   */
  private processSpecialOffers(offersData: any): SpecialOffer[] {
    if (!offersData || !Array.isArray(offersData)) return [];

    return offersData
      .filter((offer: any) => offer.isActive)
      .map((offer: any) => ({
        title: offer.title || 'Special Offer',
        description: offer.description || 'Limited time offer',
        category: offer.appliesToCategory?.name || 'All',
        discount: offer.discountPercentage || null
      }));
  }

  /**
   * Extract unique categories and brands from products
   */
  private extractCategoriesAndBrands(): void {
    const uniqueCategories = new Set<string>();
    const uniqueBrands = new Set<string>();

    this.allProducts.forEach(product => {
      if (product.category_name) {
        uniqueCategories.add(product.category_name);
      }

      if (product.specs.brand) {
        uniqueBrands.add(product.specs.brand);
      }
    });

    this.categories = ['all', ...Array.from(uniqueCategories).sort()];
    this.brands = ['all', ...Array.from(uniqueBrands).sort()];
  }

  /**
   * Update featured categories count
   */
  private updateFeaturedCategoriesCount(): void {
    this.featuredCategories = this.featuredCategories.map(category => {
      const count = this.allProducts.filter(p =>
        p.category_name === category.name
      ).length;
      return { ...category, count };
    });
  }

  /**
   * Handle category card click
   */
  onCategoryCardClick(categoryName: string): void {
    console.log('Category clicked:', categoryName);
    this.selectedCategory = categoryName;
    this.applyFilters();
  }

  /**
   * Apply all filters and sorting
   */
  applyFilters(): void {
    this.filteredProducts = this.allProducts.filter(product => {
      // Category filter
      if (this.selectedCategory !== 'all') {
        if (product.category_name !== this.selectedCategory) {
          return false;
        }
      }

      // Brand filter
      if (this.selectedBrand !== 'all') {
        if (product.specs.brand !== this.selectedBrand) {
          return false;
        }
      }

      // Price range filter
      const price = product.sale_price || product.price;
      if (price < this.minPrice || price > this.maxPrice) {
        return false;
      }

      // Search query filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const titleMatch = product.title.toLowerCase().includes(query);
        const descMatch = product.description.toLowerCase().includes(query);
        const specsMatch = this.getProductSpecs(product).toLowerCase().includes(query);

        if (!titleMatch && !descMatch && !specsMatch) {
          return false;
        }
      }

      return true;
    });

    this.sortProducts();
  }

  /**
   * Sort products based on selected option
   */
  private sortProducts(): void {
    switch (this.sortOption) {
      case 'price-low':
        this.filteredProducts.sort((a, b) =>
          (a.sale_price || a.price) - (b.sale_price || b.price)
        );
        break;
      case 'price-high':
        this.filteredProducts.sort((a, b) =>
          (b.sale_price || b.price) - (a.sale_price || a.price)
        );
        break;
      case 'rating':
        this.filteredProducts.sort((a, b) => b.rating - a.rating);
        break;
      default:
        // Featured order (keep original order)
        break;
    }
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    this.selectedCategory = 'all';
    this.selectedBrand = 'all';
    this.minPrice = 0;
    this.maxPrice = 200000;
    this.searchQuery = '';
    this.sortOption = 'featured';
    this.applyFilters();
  }

  /**
   * Add product to cart
   */
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
        const message = response.message === 'Cart item quantity updated'
          ? `${product.title} quantity updated in cart!`
          : `${product.title} added to cart!`;
        alert(message);
      },
      error: (err) => {
        this.addingToCart = false;
        const errorMessage = err.error?.message || 'Failed to add item to cart';
        alert(errorMessage);
      }
    });
  }

  /**
   * View product details
   */
  viewProductDetails(product: Product): void {
    this.productService.setSelectedProduct(product);
    this.router.navigate(['/product', product.product_id], { queryParams: { returnUrl: this.router.url } });
  }

  /**
   * Get product image URL
   */
  getProductImage(product: Product): string {
    if (!product.images || product.images.length === 0) {
      return this.getFallbackImage();
    }
    const image = product.images.find(img => img.is_primary) || product.images[0];
    return image ? this.ensureAbsoluteUrl(image.image_url) : this.getFallbackImage();
  }

  /**
   * Get product specs formatted
   */
  getProductSpecs(product: Product): string {
    const parts = [];
    if (product.specs.brand) parts.push(product.specs.brand);
    // if (product.specs.processor) parts.push(product.specs.processor);
    // if (product.specs.ram) parts.push(product.specs.ram);
    // if (product.specs.storage) parts.push(product.specs.storage);
    // if (product.specs.display) parts.push(product.specs.display);
    return parts.join(' • ');
  }

  /**
   * Get display price (sale price if available, otherwise regular price)
   */
  getDisplayPrice(product: Product): number {
    return product.sale_price || product.price;
  }

  /**
   * Calculate discount percentage
   */
  getDiscountPercentage(product: Product): number {
    if (!product.sale_price) return 0;
    return Math.round(((product.price - product.sale_price) / product.price) * 100);
  }

  /**
   * Handle category navigation click
   */
  onCategoryClick(categoryName: string): void {
    // Filter products by category
    this.selectedCategory = categoryName;
    this.applyFilters();
    // Optionally navigate to category page
    // this.router.navigate(['/categories', categoryName]);

  }

  /**
   * Handle search
   */
  onSearch(): void {
    this.applyFilters();
  }

  /**
   * Navigate to cart
   */
  goToCart(): void {
    this.router.navigate(['/cart']);
  }
}
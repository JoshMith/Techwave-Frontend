import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { ProductService, Product, Review } from '../services/product.service';
import { CartService } from '../services/cart.service';
import { ApiService } from '../services/api.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';

interface Thumbnail {
  imageSrc: string;
  thumbnailSrc: string;
  altText: string;
  active: boolean;
}

interface Specification {
  label: string;
  value: string;
}

@Component({
  selector: 'app-product',
  imports: [CommonModule, RouterModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProductComponent implements OnInit, OnDestroy {
  returnUrl: string = '/home'; // Default fallback
  constructor(
    private router: Router,
    public route: ActivatedRoute,
    public productService: ProductService,
    private cartService: CartService,
    private apiService: ApiService
  ) { }

  // Loading and error states
  isLoading = true;
  errorMessage: string | null = null;

  // Product data
  product: Product | null = null;
  reviews: Review[] = [];

  // UI State
  cartCount: number = 0;
  searchQuery: string = '';
  activeTab: string = 'description';
  isWishlisted: boolean = false;
  mainImageSrc: string = '';
  cartButtonText: string = 'Add to Cart';
  addingToCart = false;

  // Review form state
  showReviewForm: boolean = false;
  submittingReview: boolean = false;
  reviewForm = {
    rating: 0,
    comment: ''
  };
  hoverRating: number = 0;

  thumbnails: Thumbnail[] = [];
  specifications: Specification[] = [];
  categoryRoute: string = 'products';
  breadcrumbCategory: string = 'Products';

  private cartSubscription?: Subscription;
  private routeSubscription?: Subscription;

  ngOnInit(): void {
    // Get the returnUrl from query parameters
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
    console.log('Return URL:', this.returnUrl);

    // Subscribe to cart state
    this.cartSubscription = this.cartService.cartState$.subscribe(state => {
      this.cartCount = state.item_count;
    });

    // Get product ID from route and load product
    this.routeSubscription = this.route.params.subscribe(params => {
      const productId = params['id'];
      if (productId) {
        this.loadProduct(productId);
      } else {
        // Try to get product from service (if navigated from another component)
        const selectedProduct = this.productService.getSelectedProduct();
        if (selectedProduct) {
          this.loadProductFromData(selectedProduct);
        } else {
          this.errorMessage = 'Product not found';
          this.isLoading = false;
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.cartSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  /**
   * Load product from API by ID
   */
  loadProduct(productId: string): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.productService.getProductDetails(productId).subscribe({
      next: ({ product, reviews }) => {
        this.product = product;
        this.reviews = reviews;
        this.setupProductDisplay();
        this.isLoading = false;

        // console.log('Product loaded successfully:', product);
        // console.log('Reviews loaded:', reviews.length);
      },
      error: (err) => {
        console.error('Error loading product:', err);

        if (err.status === 404) {
          this.errorMessage = 'Product not found. Please check the product ID.';
        } else if (err.status === 401) {
          this.errorMessage = 'Authentication required. Please try again.';
        } else if (err.status === 500) {
          this.errorMessage = 'Server error. Please try again later.';
        } else {
          this.errorMessage = 'Failed to load product details. Please try again.';
        }

        this.isLoading = false;
      }
    });
  }

  /**
   * Load product from already fetched data
   */
  private loadProductFromData(product: Product): void {
    this.product = product;
    this.setupProductDisplay();
    this.isLoading = false;

    this.loadReviewsOnly(product.product_id.toString());
  }


  /**
   * Load reviews only (non-blocking)
   */
  private loadReviewsOnly(productId: string): void {
    this.productService.getReviewsByProductIdSafe(productId).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        console.log('Reviews loaded separately:', reviews.length);
      },
      error: (err) => {
        console.warn('Could not load reviews:', err);
        this.reviews = [];
      }
    });
  }

  /**
   * Setup product display (images, specs, etc.)
   */
  private setupProductDisplay(): void {
    if (!this.product) return;

    this.setupImages();
    this.setupSpecifications();
    this.setupCategoryRoute();
  }

  /**
   * Setup category route for breadcrumb
   */
  private setupCategoryRoute(): void {
    if (this.product?.category_name) {
      this.breadcrumbCategory = this.product.category_name;
      this.categoryRoute = this.product.category_name.toLowerCase().replace(/ /g, '-');
    } else {
      this.breadcrumbCategory = 'Products';
      this.categoryRoute = 'products';
    }
  }

  /** * Navigate back to product listing
   */
  goBack(): void {
    // Use the returnUrl from query parameters
    this.router.navigateByUrl(this.returnUrl);
  }

  /**
   * Setup product images and thumbnails
   */
  private setupImages(): void {
    if (!this.product) return;

    const productImage = this.productService.getProductImage(this.product);
    this.mainImageSrc = productImage || this.getFallbackImage();

    if (this.product.images && this.product.images.length > 0) {
      this.thumbnails = this.product.images.map((img, index) => ({
        imageSrc: img.image_url,
        thumbnailSrc: img.image_url,
        altText: img.alt_text || `${this.product!.title} - Image ${index + 1}`,
        active: img.is_primary || index === 0
      }));
    }
  }

  /**
   * Setup product specifications
   */
  private setupSpecifications(): void {
    if (!this.product) return;

    this.specifications = [];
    const specs = this.product.specs;

    if (specs.brand) this.specifications.push({ label: 'Brand', value: specs.brand });
    if (specs.model) this.specifications.push({ label: 'Model', value: specs.model });

    if (specs.display) this.specifications.push({ label: 'Display', value: specs.display });
    if (specs.screen) this.specifications.push({ label: 'Screen Size', value: specs.screen });
    if (specs.storage) this.specifications.push({ label: 'Storage', value: specs.storage });
    if (specs.ram) this.specifications.push({ label: 'RAM', value: specs.ram });
    if (specs.camera) this.specifications.push({ label: 'Camera', value: specs.camera });
    if (specs.battery) this.specifications.push({ label: 'Battery', value: specs.battery });

    if (specs.processor) this.specifications.push({ label: 'Processor', value: specs.processor });
    if (specs.os) this.specifications.push({ label: 'Operating System', value: specs.os });
    if (specs.graphics) this.specifications.push({ label: 'Graphics', value: specs.graphics });

    if (specs.connectivity) this.specifications.push({ label: 'Connectivity', value: specs.connectivity });
    if (specs.color) this.specifications.push({ label: 'Color', value: specs.color });
    if (specs.weight) this.specifications.push({ label: 'Weight', value: specs.weight });
    if (specs.dimensions) this.specifications.push({ label: 'Dimensions', value: specs.dimensions });

    for (const key in specs) {
      if (specs.hasOwnProperty(key) &&
        !['brand', 'model', 'display', 'screen', 'storage', 'ram', 'camera', 'battery',
          'processor', 'os', 'graphics', 'connectivity', 'color', 'weight', 'dimensions'].includes(key)) {
        const value = specs[key];
        if (value !== null && value !== undefined && value !== '') {
          this.specifications.push({
            label: this.formatLabel(key),
            value: String(value)
          });
        }
      }
    }
  }

  /**
   * Format label for display
   */
  private formatLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get fallback image
   */
  private getFallbackImage(): string {
    return '/images/product-placeholder.jpg';
  }

  /**
   * Change main image
   */
  changeImage(thumbnail: Thumbnail): void {
    this.mainImageSrc = thumbnail.imageSrc;
    this.thumbnails.forEach(t => t.active = false);
    thumbnail.active = true;
  }

  /**
   * Show specific tab
   */
  showTab(tabName: string): void {
    this.activeTab = tabName;
  }

  /**
   * Add product to cart
   */
  addToCart(): void {
    if (!this.product || this.addingToCart) return;

    if (this.product.stock < 1) {
      alert('This product is out of stock.');
      return;
    }

    this.addingToCart = true;
    this.cartButtonText = 'Adding...';

    this.cartService.addToCart(this.product.product_id, 1).subscribe({
      next: (response) => {
        this.cartButtonText = 'Added to Cart!';
        setTimeout(() => {
          this.cartButtonText = 'Add to Cart';
          this.addingToCart = false;
        }, 2000);
      },
      error: (err) => {
        console.error('Error adding to cart:', err);
        alert(err.error?.message || 'Failed to add item to cart');
        this.cartButtonText = 'Add to Cart';
        this.addingToCart = false;
      }
    });
  }

  /**
   * Toggle wishlist
   */
  toggleWishlist(): void {
    this.isWishlisted = !this.isWishlisted;
    // TODO: Implement wishlist API call
  }

  /**
   * Toggle review form visibility
   */
  toggleReviewForm(): void {
    this.showReviewForm = !this.showReviewForm;
    if (!this.showReviewForm) {
      this.resetReviewForm();
    }
  }

  /**
   * Set rating for review
   */
  setRating(rating: number): void {
    this.reviewForm.rating = rating;
  }

  /**
   * Set hover rating
   */
  setHoverRating(rating: number): void {
    this.hoverRating = rating;
  }

  /**
   * Clear hover rating
   */
  clearHoverRating(): void {
    this.hoverRating = 0;
  }

  /**
   * Get display rating (hover or selected)
   */
  getDisplayRating(): number {
    return this.hoverRating || this.reviewForm.rating;
  }

  getUserOrderForProduct(): Observable<number | null> {
    // This assumes you have an endpoint that checks if user has purchased this product
    return this.apiService.getUserOrderForProduct(this.product!.product_id);
  }

  /**
   * Submit review
   */
  submitReview(): void {
    if (!this.product) return;

    // Validate review
    if (this.reviewForm.rating === 0) {
      alert('Please select a rating');
      return;
    }

    if (!this.reviewForm.comment.trim()) {
      alert('Please enter a comment');
      return;
    }

    this.submittingReview = true;

    // First, get the user's order for this product
    this.apiService.getUserOrderForProduct(this.product.product_id).subscribe({
      next: (orderResponse) => {
        if (!orderResponse.order_id) {
          alert('You can only review products you have purchased and received.');
          this.submittingReview = false;
          return;
        }

        const reviewData = {
          product_id: this.product!.product_id,
          order_id: orderResponse.order_id,  // Add order_id
          rating: this.reviewForm.rating,
          comment: this.reviewForm.comment.trim()
        };

        this.apiService.createReview(reviewData).subscribe({
          next: (response) => {
            console.log('Review submitted successfully:', response);
            alert('Thank you for your review!');

            // Reload reviews
            this.loadReviewsOnly(this.product!.product_id.toString());

            // Reset and hide form
            this.resetReviewForm();
            this.showReviewForm = false;
            this.submittingReview = false;

            // Reload product to get updated rating
            this.loadProduct(this.product!.product_id.toString());
          },
          error: (err) => {
            console.error('Error submitting review:', err);

            if (err.status === 401) {
              alert('Please log in to submit a review');
              this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
            } else if (err.error?.message) {
              alert(err.error.message);
            } else {
              alert('Failed to submit review. Please try again.');
            }

            this.submittingReview = false;
          }
        });
      },
      error: (err) => {
        console.error('Error checking order:', err);
        alert('Unable to verify purchase. You can only review products you have purchased.');
        this.submittingReview = false;
      }
    });
  }

  /**
   * Reset review form
   */
  resetReviewForm(): void {
    this.reviewForm = {
      rating: 0,
      comment: ''
    };
    this.hoverRating = 0;
  }

  /**
   * Get stars array for rating display
   */
  getStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < Math.floor(rating) ? 1 : 0);
  }

  /**
   * Get rating percentage for rating breakdown
   */
  getRatingPercentage(rating: number): number {
    if (!this.reviews || this.reviews.length === 0) return 0;

    const ratingCount = this.reviews.filter(r => Math.floor(r.rating) === rating).length;
    return (ratingCount / this.reviews.length) * 100;
  }

  /**
   * Get display price
   */
  getDisplayPrice(): number {
    return this.product ? this.productService.getDisplayPrice(this.product) : 0;
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    return `KSh ${price.toLocaleString()}`;
  }

  /**
   * Get savings amount
   */
  getSavings(): number {
    return this.product ? this.productService.getSavings(this.product) : 0;
  }

  /**
   * Check if product is on sale
   */
  isOnSale(): boolean {
    return this.product ? this.productService.isOnSale(this.product) : false;
  }

  /**
   * Get discount percentage
   */
  getDiscountPercentage(): number {
    return this.product ? this.productService.getDiscountPercentage(this.product) : 0;
  }

  /**
   * Navigation methods
   */
  onSearch(query: string): void {
    if (query) {
      this.router.navigate(['/shop'], { queryParams: { q: query } });
    }
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  onCategoryClick(category: string): void {
    this.router.navigate([`/categories/${category.toLowerCase().replace(' ', '-')}`]);
  }

  /**
   * Get current product ID for retry
   */
  getCurrentProductId(): string {
    return this.route.snapshot.params['id'];
  }

  /**
   * Handle image error
   */
  onImageError(event: any): void {
    event.target.src = this.getFallbackImage();
  }
}
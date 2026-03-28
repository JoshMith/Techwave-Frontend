import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface Product {
  product_id: number;
  title: string;
  description: string;
  price: number;
  sale_price: number | null;
  stock: number;
  condition?: 'new' | 'ex_uk';
  specs: {
    brand?: string;
    processor?: string;
    ram?: string;
    storage?: any;
    display?: string;
    screen?: string;
    os?: string;
    model?: string;
    camera?: string;
    battery?: string;
    connectivity?: string;
    dimensions?: string;
    weight?: string;
    graphics?: string;
    color?: string;
    [key: string]: any;
  };
  rating: number;
  review_count: number;
  category_id: number;
  category_name?: string;
  seller_id: number;
  seller_name?: string;
  images: ProductImage[];
}

export interface ProductImage {
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}

export interface Review {
  review_id: number;
  user_id: number;
  product_id: number;
  rating: number;
  comment: string;
  created_at: string;
  user_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  // BehaviorSubject to hold the currently selected product
  private selectedProductSubject = new BehaviorSubject<Product | null>(null);
  public selectedProduct$ = this.selectedProductSubject.asObservable();

  constructor(private apiService: ApiService) {}

  /**
   * Set the selected product
   */
  setSelectedProduct(product: Product): void {
    this.selectedProductSubject.next(product);
  }

  /**
   * Get the currently selected product
   */
  getSelectedProduct(): Product | null {
    return this.selectedProductSubject.value;
  }

  /**
   * Clear the selected product
   */
  clearSelectedProduct(): void {
    this.selectedProductSubject.next(null);
  }

  /**
   * Get product by ID with images
   */
  getProductById(productId: string): Observable<Product> {
    return this.apiService.getProductById(productId).pipe(
      switchMap((product: Product) => {
        // Fetch images for the product
        return this.apiService.serveProductImagesSafe(productId).pipe(
          map(images => ({
            ...product,
            images: this.processImages(images)
          })),
          catchError(error => {
            console.warn('Error loading product images, using fallback:', error);
            // Return product without images if images fail to load
            return of({
              ...product,
              images: []
            });
          })
        );
      }),
      catchError(error => {
        console.error('Error loading product:', error);
        throw error; // Re-throw to be handled by component
      })
    );
  }

  /**
   * Get product with all related data (images, reviews, etc.)
   */
  getProductDetails(productId: string): Observable<{
    product: Product;
    reviews: Review[];
  }> {
    return forkJoin({
      product: this.getProductById(productId),
      reviews: this.getReviewsByProductIdSafe(productId) // Use safe review method
    });
  }

  /**
   * Safely get reviews with error handling
   */
  public getReviewsByProductIdSafe(productId: string): Observable<Review[]> {
    return this.apiService.getReviewsByProductId(productId).pipe(
      catchError(error => {
        console.warn('Error loading reviews, returning empty array:', error);
        // Return empty array for reviews if API fails
        return of([]);
      })
    );
  } 

  /**
   * Process images to ensure absolute URLs
   */
  private processImages(images: any[]): ProductImage[] {
    if (!images || !Array.isArray(images)) return [];
 
    return images.map(img => ({
      image_url: this.ensureAbsoluteUrl(img.image_url),
      alt_text: img.alt_text || 'Product image',
      is_primary: img.is_primary || false
    }));
  }

  /**
   * Ensure image URL is absolute
   */
  private ensureAbsoluteUrl(url: string): string {
    if (!url) return this.getFallbackImage();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Assuming the backend serves images from the /public directory
    return `${this.apiService['apiUrl']}/${url}`;
  }

  /**
   * Get fallback image
   */
  private getFallbackImage(): string {
    return 'assets/images/product-placeholder.png';
  }

  /**
   * Format product specs for display
   */
  formatSpecs(specs: any): string {
    const parts = [];
    
    // Common spec fields
    if (specs.brand) parts.push(specs.brand);
    if (specs.processor) parts.push(specs.processor);
    if (specs.ram) parts.push(specs.ram);
    if (specs.storage) parts.push(specs.storage);
    if (specs.display) parts.push(specs.display);
    if (specs.screen) parts.push(specs.screen);
    if (specs.os) parts.push(specs.os);
    
    return parts.join(' • ');
  }

  /**
   * Get product image URL
   */
  getProductImage(product: Product): string | null {
    if (!product.images || product.images.length === 0) {
      return null;
    }
    const image = product.images.find(img => img.is_primary) || product.images[0];
    return this.ensureAbsoluteUrl(image.image_url);
  }

  /**
   * Calculate discount percentage
   */
  getDiscountPercentage(product: Product): number {
    if (!product.sale_price) return 0;
    return Math.round(((product.price - product.sale_price) / product.price) * 100);
  }

  /**
   * Get display price (sale price if available, otherwise regular price)
   */
  getDisplayPrice(product: Product): number {
    return product.sale_price || product.price;
  }

  /**
   * Check if product is on sale
   */
  isOnSale(product: Product): boolean {
    return !!product.sale_price && product.sale_price < product.price;
  }

  /**
   * Get savings amount
   */
  getSavings(product: Product): number {
    if (!product.sale_price) return 0;
    return product.price - product.sale_price;
  }
}
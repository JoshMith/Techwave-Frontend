import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

export interface Category {
  category_id?: string;
  name: string;
}

export interface ProductSpec {
  key: string;
  value: string;
}

export interface ProductImage {
  image_id?: string;
  id?: string;
  productImageId?: string;
  product_image_id?: string;
  imageId?: string;
  image_url: string;
  alt_text?: string;
  is_primary?: boolean;
}

export interface Product {
  product_id?: string;
  seller_id?: string;
  category_id: string;
  title: string;
  description: string;
  price: number;
  sale_price?: number;
  stock: number;
  specs?: ProductSpec[] | string;
  status?: string;
  rating?: number;
  categoryName?: string;
  category_name?: string;
}

@Injectable({ providedIn: 'root' })
export class SellerProductsService {
  constructor(private api: ApiService) {}

  loadAll(): Observable<Product[]> {
    return this.api.getProducts().pipe(
      map((res) => (Array.isArray(res) ? res : [])),
      catchError(() => of([]))
    );
  }

  loadCategories(): Observable<Category[]> {
    return this.api.getCategories().pipe(
      map((res) => (Array.isArray(res) ? res : [])),
      catchError(() => of([]))
    );
  }

  loadImages(productId: string): Observable<ProductImage[]> {
    return this.api.serveProductImagesSafe(productId).pipe(
      map((res) => (Array.isArray(res) ? res : [])),
      catchError(() => of([]))
    );
  }

  /**
   * Creates a product then uploads images.
   * Returns the new productId as a string.
   */
  create(payload: {
    sellerId: string;
    product: Partial<Product>;
    specs: ProductSpec[];
    images: File[];
  }): Observable<string> {
    const specsObject: Record<string, string> = {};
    payload.specs.forEach(({ key, value }) => {
      if (key.trim() && value.trim()) specsObject[key.trim()] = value.trim();
    });

    const productData = {
      seller_id: payload.sellerId,
      category_id: payload.product.category_id,
      title: payload.product.title,
      description: payload.product.description,
      price: payload.product.price,
      sale_price: payload.product.sale_price || null,
      stock: payload.product.stock ?? 0,
      specs: JSON.stringify(specsObject),
    };

    return this.api.createProduct(productData).pipe(
      switchMap((res) => {
        const productId = res.productId?.toString();
        if (!productId) throw new Error('Product created but ID was missing');
        if (payload.images.length === 0) return of(productId);

        const formData = new FormData();
        payload.images.forEach((f) => formData.append('images', f));
        formData.append('setPrimary', 'true');
        formData.append('altText', (payload.product.title as string) ?? 'Product');

        return this.api.uploadProductImages(productId, formData).pipe(map(() => productId));
      })
    );
  }

  update(productId: string, payload: {
    product: Partial<Product>;
    newImages: File[];
    imagesToDelete?: string[];
  }): Observable<void> {
    return this.api.updateProduct(productId, payload.product).pipe(
      switchMap(() => {
        const tasks: Observable<any>[] = [];

        (payload.imagesToDelete ?? []).forEach((imageId) => {
          tasks.push(this.api.deleteProductImage(imageId).pipe(catchError(() => of(null))));
        });

        if (payload.newImages.length > 0) {
          const formData = new FormData();
          payload.newImages.forEach((f) => formData.append('images', f));
          formData.append('altText', (payload.product as Product).title ?? 'Product image');
          tasks.push(this.api.uploadProductImages(productId, formData));
        }

        return tasks.length > 0 ? forkJoin(tasks).pipe(map(() => void 0)) : of(void 0);
      }),
      map(() => void 0)
    );
  }

  delete(productId: string): Observable<void> {
    return this.api.deleteProduct(productId).pipe(map(() => void 0));
  }

  deleteImage(imageId: string): Observable<void> {
    return this.api.deleteProductImage(imageId).pipe(map(() => void 0));
  }

  /** Returns error string or null if valid */
  validate(product: Partial<Product>): string | null {
    if (!product.title?.trim()) return 'Product title is required';
    if ((product.title?.length ?? 0) > 200) return 'Product title must be 200 characters or less';
    if (!product.description?.trim()) return 'Product description is required';
    if ((product.price ?? 0) <= 0) return 'Product price must be greater than 0';
    if (!product.category_id) return 'Please select a category';
    if ((product.stock ?? 0) < 0) return 'Stock cannot be negative';
    if (product.sale_price && product.sale_price >= (product.price ?? 0)) {
      return 'Sale price must be less than regular price';
    }
    return null;
  }

  /** Extracts image_id handling all known API property name variants */
  extractImageId(image: ProductImage): string | null {
    return (
      (image as any).image_id ??
      (image as any).id ??
      (image as any).productImageId ??
      (image as any).product_image_id ??
      (image as any).imageId ??
      null
    );
  }

  filter(
    products: Product[],
    search: string,
    categoryId: string,
    minPrice: number | null,
    maxPrice: number | null,
    status: string
  ): Product[] {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (term) {
        const t = ((p.title ?? '') + ' ' + (p.description ?? '')).toLowerCase();
        if (!t.includes(term)) return false;
      }
      if (categoryId && String(p.category_id) !== String(categoryId)) return false;
      const price = p.sale_price ?? p.price ?? 0;
      if (minPrice !== null && price < minPrice) return false;
      if (maxPrice !== null && price > maxPrice) return false;
      if (status) {
        const st = (p.status ?? 'active').toLowerCase();
        if (st !== status.toLowerCase()) return false;
      }
      return true;
    });
  }
}
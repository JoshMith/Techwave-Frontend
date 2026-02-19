// ============================================
// search.service.ts
// Angular service for product search
// ============================================

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { ApiService } from './api.service';

export interface SearchFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  products: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  query: string;
  filters: SearchFilters;
}

export interface SearchSuggestion {
  products: { product_id: string; title: string; category_name: string; brand: string; display_price: number }[];
  categories: { category_name: string; count: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchSubject = new Subject<string>();
  
  // Reactive search query stream with debounce
  searchQuery$ = this.searchSubject.pipe(
    debounceTime(300),
    distinctUntilChanged()
  );

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {}

  /**
   * Trigger a search (debounced)
   */
  triggerSearch(query: string): void {
    this.searchSubject.next(query);
  }

  /**
   * Search products with filters
   */
  searchProducts(filters: SearchFilters): Observable<SearchResult> {
    let params = new HttpParams();
    
    if (filters.q) params = params.set('q', filters.q);
    if (filters.category && filters.category !== 'all') params = params.set('category', filters.category);
    if (filters.minPrice != null) params = params.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice != null) params = params.set('maxPrice', filters.maxPrice.toString());
    if (filters.brand && filters.brand !== 'all') params = params.set('brand', filters.brand);
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());

    const url = `${this.apiService.getApiBaseUrl()}/products/search`;
    return this.http.get<SearchResult>(url, { params, withCredentials: true });
  }

  /**
   * Get autocomplete suggestions
   */
  getSuggestions(query: string): Observable<SearchSuggestion> {
    if (!query || query.trim().length < 2) {
      return of({ products: [], categories: [] });
    }
    
    const params = new HttpParams().set('q', query.trim());
    const url = `${this.apiService.getApiBaseUrl()}/products/search/suggestions`;
    return this.http.get<SearchSuggestion>(url, { params, withCredentials: true }).pipe(
      catchError(() => of({ products: [], categories: [] }))
    );
  }
}
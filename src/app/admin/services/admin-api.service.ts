// src/app/admin/services/admin-api.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

@Injectable({ providedIn: 'root' })
export class AdminApiService {

  private get apiUrl(): string { return this.api.apiUrl; }

  private get opts() {
    return {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      withCredentials: true,
    };
  }

  constructor(private http: HttpClient, private api: ApiService) { }

  // ── Auth ───────────────────────────────────────────────────────────────────
  getCurrentUser(): Observable<any> { return this.api.getCurrentUser(); }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/dashboard/stats`, this.opts);
  }
  getRevenueTrends(period = 6): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/dashboard/revenue-trends?period=${period}`, this.opts);
  }
  getTopProducts(limit = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/dashboard/top-products?limit=${limit}`, this.opts);
  }
  getTopCustomers(limit = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/dashboard/top-customers?limit=${limit}`, this.opts);
  }
  /** v2: replaces getTopSellers */
  getTopAgents(limit = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/dashboard/top-agents?limit=${limit}`, this.opts);
  }
  getRecentOrders(limit = 20): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/dashboard/recent-orders?limit=${limit}`, this.opts);
  }
  getRecentUsers(limit = 20): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/dashboard/recent-users?limit=${limit}`, this.opts);
  }
  getLowStockProducts(threshold = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/dashboard/low-stock-products?threshold=${threshold}`, this.opts);
  }
  getCategoryPerformance(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/dashboard/category-performance`, this.opts);
  }

  // ── Products ───────────────────────────────────────────────────────────────
  getProducts(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/products`, this.opts).pipe(
      map((r: any) => Array.isArray(r) ? r : []),
      catchError(() => of([])),
    );
  }
  getCategories(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/categories`, this.opts).pipe(
      map((r: any) => Array.isArray(r) ? r : []),
      catchError(() => of([])),
    );
  }
  getProductImages(productId: string): Observable<any[]> {
    return this.api.serveProductImagesSafe(productId);
  }

  createProduct(data: any): Observable<string> {
    return this.http.post<any>(`${this.apiUrl}/products`, data, this.opts).pipe(
      map((res) => {
        const id = res?.product_id ?? res?.productId ?? res?.id;
        if (!id) throw new Error('Product created but ID missing');
        return String(id);
      }),
    );
  }
  uploadProductImages(productId: string, formData: FormData): Observable<any> {
    return this.api.uploadProductImages(productId, formData);
  }
  updateProduct(productId: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/products/${productId}`, data, this.opts);
  }
  deleteProduct(productId: string): Observable<void> {
    return this.http.delete(`${this.apiUrl}/products/${productId}`, this.opts).pipe(map(() => void 0));
  }
  deleteProductImage(imageId: string): Observable<void> {
    return this.api.deleteProductImage(imageId).pipe(map(() => void 0));
  }

  // ── Orders ─────────────────────────────────────────────────────────────────
  getOrders(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/orders`, this.opts).pipe(
      map((r: any) => Array.isArray(r) ? r : []),
      catchError(() => of([])),
    );
  }
  getOrderDetails(orderId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/manage/orders/${orderId}/details`, this.opts);
  }
  updateOrderStatus(orderId: string, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}`, { status }, this.opts);
  }
  confirmCodPayment(paymentId: string): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/admin/manage/payments/${paymentId}/confirm`,
      { isConfirmed: true },
      this.opts,
    );
  }
  getPendingPayments(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/admin/manage/payments/pending`, this.opts).pipe(
      map((r: any) => Array.isArray(r) ? r : r?.data ?? []),
      catchError(() => of([])),
    );
  }

  // ── Agents ─────────────────────────────────────────────────────────────────
  getAgents(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/agents`, this.opts).pipe(
      map((r: any) => Array.isArray(r) ? r : []),
      catchError(() => of([])),
    );
  }
  createAgent(data: { full_name: string; phone: string; id_number: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/agents`, data, this.opts);
  }
  updateAgent(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/agents/${id}`, data, this.opts);
  }
  deactivateAgent(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/agents/${id}/deactivate`, {}, this.opts);
  }
  getCommissionReport(filters: { from?: string; to?: string; agent_id?: string } = {}): Observable<any> {
    const p = new URLSearchParams();
    if (filters.from) p.set('from', filters.from);
    if (filters.to) p.set('to', filters.to);
    if (filters.agent_id) p.set('agent_id', filters.agent_id);
    const q = p.toString() ? `?${p}` : '';
    return this.http.get(`${this.apiUrl}/agents/commissions/report${q}`, this.opts);
  }

  // ── Customers ──────────────────────────────────────────────────────────────
  getUsers(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/users`, this.opts).pipe(
      map((r: any) => Array.isArray(r) ? r : []),
      catchError(() => of([])),
    );
  }
  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`, this.opts);
  }
  // In admin-api.service.ts - replace the getOrdersByUser method

  getOrdersByUser(userId: string): Observable<any[]> {
    // First, try to get orders directly from the API with user filter
    return this.http.get<any>(`${this.apiUrl}/orders/user/${userId}`, this.opts).pipe(
      map((response: any) => {
        // Handle different response formats
        if (Array.isArray(response)) return response;
        if (response?.data && Array.isArray(response.data)) return response.data;
        if (response?.orders && Array.isArray(response.orders)) return response.orders;
        return [];
      }),
      catchError((error) => {
        // Fallback: filter all orders if direct endpoint fails
        console.warn(`Direct orders endpoint failed for user ${userId}, falling back to filter:`, error);
        return this.getOrders().pipe(
          map((orders) => {
            const filtered = orders.filter((o: any) => {
              // Try multiple possible field names for user/customer reference
              const orderUserId = o.user_id || o.customer_id || o.userId || o.customerId;
              return String(orderUserId) === String(userId);
            });
            console.log(`Found ${filtered.length} orders for user ${userId}`);
            return filtered;
          })
        );
      })
    );
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  updateAdminProfile(userId: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}`, data, this.opts);
  }
  changePassword(userId: string, newPassword: string): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/admin/manage/users/${userId}/reset-password`,
      { newPassword },
      this.opts,
    );
  }
}
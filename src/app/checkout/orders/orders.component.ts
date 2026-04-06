// src/app/checkout/orders/orders.component.ts

import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Subscription } from 'rxjs';

interface OrderStatusStep {
  key: string;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css',
})
export class OrdersComponent implements OnInit, OnDestroy {

  order: any = null;
  isLoading = true;
  error: string | null = null;
  orderId: string | null = null;
  isNewOrder = false;

  private routeSub?: Subscription;
  private orderSub?: Subscription;

  readonly statusSteps: OrderStatusStep[] = [
    { key: 'pending',    label: 'Order Placed',       icon: '📋', description: 'Your order has been received.' },
    { key: 'paid',       label: 'Payment Confirmed',  icon: '✅', description: 'Payment has been confirmed.' },
    { key: 'processing', label: 'Processing',         icon: '⚙️', description: 'Your order is being prepared.' },
    { key: 'shipped',    label: 'Shipped',             icon: '🚚', description: 'Your order is on its way.' },
    { key: 'delivered',  label: 'Delivered',           icon: '📦', description: 'Your order has been delivered.' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isNewOrder = history.state?.orderSuccess === true;

      if (history.state?.order) {
        this.order = this.transformOrderData(history.state.order);
        this.isLoading = false;
        return;
      }
    }

    this.routeSub = this.route.paramMap.subscribe(params => {
      this.orderId = params.get('id');
      if (this.orderId) {
        this.loadOrder(this.orderId);
      } else {
        this.loadUserOrders();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.orderSub?.unsubscribe();
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  private loadOrder(orderId: string): void {
    this.isLoading = true;
    this.error = null;

    this.orderSub = this.apiService.getOrderById(orderId).subscribe({
      next: (response: any) => {
        const raw = response.order ?? response;
        this.order = this.transformOrderData(raw);
        if (!this.order) {
          this.error = 'Order not found or invalid response format.';
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        if (err.status === 404) {
          this.error = `Order #${orderId} not found.`;
        } else if (err.status === 401) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
          return;
        } else if (err.status === 403) {
          this.error = 'You don\'t have permission to view this order.';
        } else {
          this.error = err?.error?.message ?? 'Failed to load order details. Please try again.';
        }
        this.isLoading = false;
      },
    });
  }

  private loadUserOrders(): void {
    this.isLoading = true;
    this.error = null;

    this.apiService.getOrdersByUserId().subscribe({
      next: (response: any) => {
        const orders: any[] = response.orders ?? response ?? [];
        if (orders.length > 0) {
          this.router.navigate(['/orders', orders[0].order_id]);
        } else {
          this.error = 'You haven\'t placed any orders yet.';
          this.isLoading = false;
        }
      },
      error: () => {
        this.error = 'Failed to load your orders. Please try again.';
        this.isLoading = false;
      },
    });
  }

  // ── Data transform ─────────────────────────────────────────────────────────
  // Backend returns flat fields (city, street, etc.) and items[].
  // Template expects order_items[] and nested address{}.

  private transformOrderData(raw: any): any {
    if (!raw) return null;

    const orderItems = (raw.items ?? []).map((item: any) => ({
      order_item_id: item.order_item_id,
      product_id:    item.product_id,
      product_title: item.product_title,
      quantity:      item.quantity,
      unit_price:    parseFloat(item.unit_price ?? 0),
      subtotal:      parseFloat(item.subtotal   ?? 0),
      discount:      parseFloat(item.discount   ?? 0),
    }));

    const address = {
      full_name:   raw.customer_name  ?? '',
      street:      raw.street         ?? '',
      building:    raw.building       ?? '',
      city:        raw.city           ?? '',
      county:      raw.city           ?? '',   // backend doesn't return county separately
      country:     'Kenya',
      phone:       raw.customer_phone ?? '',
      postal_code: raw.postal_code    ?? '',
    };

    return {
      ...raw,
      order_items:   orderItems,
      address:       address,
      delivery_cost: parseFloat(raw.delivery_fee ?? 0),
      delivery_city: raw.city ?? '',
    };
  }

  // ── Status helpers ─────────────────────────────────────────────────────────

  getStepIndex(statusKey: string): number {
    return this.statusSteps.findIndex(s => s.key === statusKey);
  }

  getCurrentStepIndex(): number {
    if (!this.order?.status) return 0;
    const idx = this.getStepIndex(this.order.status);
    return idx === -1 ? 0 : idx;
  }

  isStepCompleted(step: OrderStatusStep): boolean {
    return this.getStepIndex(step.key) < this.getCurrentStepIndex();
  }

  isStepActive(step: OrderStatusStep): boolean {
    return this.getStepIndex(step.key) === this.getCurrentStepIndex();
  }

  isCancelled(): boolean {
    return this.order?.status === 'cancelled';
  }

  getStatusLabel(): string {
    const step = this.statusSteps.find(s => s.key === this.order?.status);
    return step?.label ?? (this.order?.status ?? 'Unknown');
  }

  getStatusClass(): string {
    const map: Record<string, string> = {
      pending:    'status-pending',
      paid:       'status-paid',
      processing: 'status-processing',
      shipped:    'status-shipped',
      delivered:  'status-delivered',
      cancelled:  'status-cancelled',
    };
    return map[this.order?.status] ?? 'status-pending';
  }

  // ── Formatting ─────────────────────────────────────────────────────────────

  getPaymentMethodLabel(): string {
    const map: Record<string, string> = {
      mpesa:            'M-Pesa',
      cash_on_delivery: 'Cash on Delivery',
      card:             'Card',
    };
    return map[this.order?.payment_method] ?? this.order?.payment_method ?? '—';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-KE', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  formatAmount(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    return isNaN(num) ? '—' : `KSh ${num.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
  }

  getItemTotal(item: any): number {
    return (parseFloat(item.unit_price) * item.quantity) - (parseFloat(item.discount) || 0);
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  continueShopping(): void {
    this.router.navigate(['/shop']);
  }

  viewAllOrders(): void {
    this.router.navigate(['/profile'], { fragment: 'orders' });
  }
}
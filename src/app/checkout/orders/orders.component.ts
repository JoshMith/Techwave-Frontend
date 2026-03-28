import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit, OnDestroy {

  order: any = null;
  isLoading = true;
  error: string | null = null;
  orderId: string | null = null;

  // Whether customer arrived from a just-completed checkout
  isNewOrder = false;

  private routeSub?: Subscription;
  private orderSub?: Subscription;

  // Status pipeline — matches backend enum order
  readonly statusSteps: OrderStatusStep[] = [
    { key: 'pending',    label: 'Order Placed',   icon: '📋', description: 'Your order has been received.' },
    { key: 'paid',       label: 'Payment Confirmed', icon: '✅', description: 'Payment has been confirmed.' },
    { key: 'processing', label: 'Processing',     icon: '⚙️',  description: 'Your order is being prepared.' },
    { key: 'shipped',    label: 'Shipped',         icon: '🚚', description: 'Your order is on its way.' },
    { key: 'delivered',  label: 'Delivered',       icon: '📦', description: 'Your order has been delivered.' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Check if arriving from a successful checkout
    if (isPlatformBrowser(this.platformId)) {
      this.isNewOrder = history.state?.orderSuccess === true;
    }

    this.routeSub = this.route.paramMap.subscribe(params => {
      this.orderId = params.get('id');
      if (this.orderId) {
        this.loadOrder(this.orderId);
      } else {
        this.error = 'No order ID provided.';
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.orderSub?.unsubscribe();
  }

  private loadOrder(orderId: string): void {
    this.isLoading = true;
    this.error = null;

    this.orderSub = this.apiService.getOrderById(orderId).subscribe({
      next: (response: any) => {
        // Handle both { order: {...} } and direct order object shapes
        this.order = response.order ?? response;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Failed to load order details. Please try again.';
        this.isLoading = false;
      }
    });
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

  // ── Payment method display ─────────────────────────────────────────────────

  getPaymentMethodLabel(): string {
    const map: Record<string, string> = {
      mpesa:            'M-Pesa',
      cash_on_delivery: 'Cash on Delivery',
      card:             'Card',
    };
    return map[this.order?.payment_method] ?? this.order?.payment_method ?? '—';
  }

  // ── Formatting ─────────────────────────────────────────────────────────────

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-KE', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatAmount(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '—' : `KSh ${num.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
  }

  getItemTotal(item: any): number {
    return (item.unit_price * item.quantity) - (item.discount || 0);
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  continueShopping(): void {
    this.router.navigate(['/shop']);
  }

  viewAllOrders(): void {
    this.router.navigate(['/profile'], { fragment: 'orders' });
  }
}
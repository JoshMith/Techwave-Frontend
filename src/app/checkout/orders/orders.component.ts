// orders.component.ts - Updated to handle both response formats

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
      
      // Also check if we have order data in state
      if (history.state?.order) {
        console.log('📦 Order from state:', history.state.order);
        this.order = history.state.order;
        this.isLoading = false;
        return;
      }
    }

    this.routeSub = this.route.paramMap.subscribe(params => {
      this.orderId = params.get('id');
      if (this.orderId) {
        this.loadOrder(this.orderId);
      } else {
        // If no order ID, redirect to profile orders list
        this.loadUserOrders();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.orderSub?.unsubscribe();
  }

  private loadUserOrders(): void {
    this.isLoading = true;
    this.error = null;

    this.apiService.getOrdersByUserId().subscribe({
      next: (response: any) => {
        const orders = response.orders ?? response;
        if (orders && orders.length > 0) {
          // Redirect to the most recent order
          this.router.navigate(['/orders', orders[0].order_id]);
        } else {
          this.error = 'You haven\'t placed any orders yet.';
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Failed to load orders:', err);
        this.error = 'Failed to load your orders. Please try again.';
        this.isLoading = false;
      }
    });
  }

  private loadOrder(orderId: string): void {
    this.isLoading = true;
    this.error = null;

    console.log('🔍 Loading order with ID:', orderId);

    this.orderSub = this.apiService.getOrderById(orderId).subscribe({
      next: (response: any) => {
        console.log('📦 Order API response:', response);
        
        // Handle different response formats
        let orderData = response.order ?? response;
        
        // Transform the data to match frontend expectations
        this.order = this.transformOrderData(orderData);
        
        if (!this.order) {
          this.error = 'Order not found or invalid response format.';
        }
        
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('❌ Failed to load order:', err);
        
        // Provide more detailed error message
        if (err.status === 404) {
          this.error = `Order #${orderId} not found. The order may not have been created successfully.`;
        } else if (err.status === 401) {
          this.error = 'Please log in to view your orders.';
          // Redirect to login with return URL
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: this.router.url }
          });
        } else if (err.status === 403) {
          this.error = 'You don\'t have permission to view this order.';
        } else {
          this.error = err?.error?.message || 'Failed to load order details. Please try again.';
        }
        
        this.isLoading = false;
      }
    });
  }

  /**
   * Transform backend order data to match frontend expectations
   */
  private transformOrderData(backendOrder: any): any {
    if (!backendOrder) return null;

    // Map items from 'items' (backend) to 'order_items' (frontend expectation)
    const orderItems = (backendOrder.items || []).map((item: any) => ({
      order_item_id: item.order_item_id,
      product_id: item.product_id,
      product_title: item.product_title,
      title: item.product_title, // For compatibility with template
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      discount: 0 // Add discount if available in your data
    }));

    // Extract address information
    const address = {
      full_name: backendOrder.customer_name,
      street: backendOrder.street,
      building: backendOrder.building,
      city: backendOrder.city,
      county: backendOrder.city, // Use city as county if not separate
      country: 'Kenya',
      phone: backendOrder.customer_phone,
      postal_code: backendOrder.postal_code
    };

    return {
      ...backendOrder,
      order_items: orderItems,
      address: address,
      delivery_cost: backendOrder.delivery_fee,
      delivery_city: backendOrder.city
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
// src/app/checkout/payment/payment.component.ts
//
// Fix summary (vs original):
//  1. Reads checkout context from BOTH localStorage ("paymentInfo") and
//     router history.state — whichever is available.
//  2. Fetches cart items via GET /cart-items/cart/:id at order-creation time
//     so `items[]` is always present in the payload.
//  3. Sends `payment_method` as its own top-level field (not buried in `notes`).
//  4. Strips extraneous fields (cart_id, status, user_id) that the backend ignores.
//  5. Clears the localStorage "paymentInfo" key after a successful order.

import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, takeWhile } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { MpesaService } from '../../services/mpesa.service';
import { HeaderComponent } from '../../shared/header/header.component';
import { FooterComponent } from '../../shared/footer/footer.component';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css'],
})
export class PaymentComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── State ──────────────────────────────────────────────────────────────────
  selectedMethod: 'mpesa' | 'cod' = 'mpesa';
  isLoading    = false;
  isPolling    = false;
  errorMessage = '';

  currentUser: any   = null;
  checkoutData: any  = null;   // { addressId, totalAmount, deliveryFee, phone, cartId }
  cartItems: any[]   = [];     // fetched from API before order creation

  pendingOrderId: number | null = null;

  readonly isBrowser: boolean;

  constructor(
    private apiService: ApiService,
    private cartService: CartService,
    private mpesaService: MpesaService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadCheckoutData();
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Load checkout context ──────────────────────────────────────────────────
  // Supports both router state (our new flow) and localStorage (original flow).
  private loadCheckoutData(): void {
    if (!this.isBrowser) return;

    // 1. Try router navigation state first (cleanest)
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state?.['checkoutData']) {
      this.checkoutData = nav.extras.state['checkoutData'];
      return;
    }

    // 2. Try history.state (available after navigation completes)
    if (history.state?.checkoutData) {
      this.checkoutData = history.state.checkoutData;
      return;
    }

    // 3. Fallback: read from localStorage.
    //    details.component writes under 'payment_data'.
    //    Some older versions wrote 'paymentInfo'. Try both.
    const raw = localStorage.getItem('payment_data') ?? localStorage.getItem('paymentInfo');
    if (raw) {
      try {
        const info = JSON.parse(raw);
        // Normalise all field-name variants from both details.component versions:
        // payment_data shape: { cartId, addressId, subtotal, deliveryCost, finalTotal, deliveryCity }
        // paymentInfo shape:  { addressId, totalAmount, deliveryFee, phone, cartId }
        this.checkoutData = {
          addressId:    info.addressId     ?? info.address_id,
          totalAmount:  info.finalTotal    ?? info.totalAmount  ?? info.total_amount ?? info.subtotal,
          deliveryFee:  info.deliveryCost  ?? info.deliveryFee  ?? info.delivery_fee ?? 0,
          deliveryCity: info.deliveryCity  ?? '',
          phone:        info.phone         ?? info.phoneNumber  ?? '',
          cartId:       info.cartId        ?? info.cart_id,
          subtotal:     info.subtotal      ?? info.totalAmount  ?? info.total_amount,
          items:        info.items         ?? null,
        };
      } catch {
        this.errorMessage = 'Could not load checkout data. Please return to your cart.';
      }
    } else {
      this.errorMessage = 'No checkout data found. Please return to your cart.';
    }
  }

  // ── Load authenticated user ────────────────────────────────────────────────
  private loadCurrentUser(): void {
    this.apiService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.currentUser = res?.user ?? res;
      },
      error: () => {
        this.router.navigate(['/login']);
      },
    });
  }

  // ── Place order (entry point) ──────────────────────────────────────────────
  placeOrder(): void {
    if (!this.currentUser) {
      this.errorMessage = 'You must be logged in to place an order.';
      return;
    }
    if (!this.checkoutData?.addressId && !this.checkoutData?.address_id) {
      this.errorMessage = 'Delivery address missing. Please go back and select an address.';
      return;
    }

    this.isLoading    = true;
    this.errorMessage = '';

    // If items were already passed via checkoutData, skip the fetch
    if (this.checkoutData.items?.length) {
      this.cartItems = this.checkoutData.items;
      this.proceedWithOrder();
      return;
    }

    // Otherwise fetch items from the cart API
    const cartId = this.checkoutData.cartId ?? this.checkoutData.cart_id
                ?? this.cartService.getCurrentCartId();

    if (!cartId) {
      this.isLoading    = false;
      this.errorMessage = 'Cart not found. Please return to your cart.';
      return;
    }

    this.apiService.getCartItemsByCartId(String(cartId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          // API may return { items: [...] } or the array directly
          const raw: any[] = res?.items ?? res ?? [];
          if (!raw.length) {
            this.isLoading    = false;
            this.errorMessage = 'Your cart is empty. Please add items before checking out.';
            return;
          }
          // Map to the shape the backend expects: { product_id, quantity, discount? }
          this.cartItems = raw.map((item: any) => ({
            product_id: item.product_id,
            quantity:   item.quantity,
            discount:   item.discount ?? 0,
          }));
          this.proceedWithOrder();
        },
        error: () => {
          this.isLoading    = false;
          this.errorMessage = 'Failed to load cart items. Please try again.';
        },
      });
  }

  // ── Build and dispatch the order ───────────────────────────────────────────
  private proceedWithOrder(): void {
    if (this.selectedMethod === 'mpesa') {
      this.placeMpesaOrder();
    } else {
      this.placeCodOrder();
    }
  }

  private buildOrderPayload(paymentMethod: 'mpesa' | 'cash_on_delivery'): object {
    const referralCode = this.getReferralCode();

    const payload: any = {
      address_id:     this.checkoutData.addressId  ?? this.checkoutData.address_id,
      payment_method: paymentMethod,                              // own top-level field
      total_amount:   this.checkoutData.totalAmount ?? this.checkoutData.total_amount,
      delivery_fee:   this.checkoutData.deliveryFee ?? this.checkoutData.delivery_fee ?? 0,
      items:          this.cartItems,                            // required by backend
    };

    if (referralCode) payload.referral_code = referralCode;

    return payload;
  }

  // ── COD flow ───────────────────────────────────────────────────────────────
  private placeCodOrder(): void {
    const payload = this.buildOrderPayload('cash_on_delivery');

    this.apiService.createOrder(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.clearStoredPaymentInfo();
        this.cartService.clearCart();
        this.router.navigate(['/orders', res.order_id]);
      },
      error: (err: any) => {
        this.isLoading    = false;
        this.errorMessage = err?.error?.message ?? 'Failed to place order. Please try again.';
      },
    });
  }

  // ── M-Pesa flow ────────────────────────────────────────────────────────────
  private placeMpesaOrder(): void {
    const payload = this.buildOrderPayload('mpesa');

    this.apiService.createOrder(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (order: any) => {
        this.pendingOrderId = order.order_id;
        this.initiateMpesaStk(order.order_id);
      },
      error: (err: any) => {
        this.isLoading    = false;
        this.errorMessage = err?.error?.message ?? 'Failed to create order. Please try again.';
      },
    });
  }

  private initiateMpesaStk(orderId: number): void {
    const phone  = this.checkoutData.phone || this.currentUser?.phone;
    const amount = this.checkoutData.totalAmount ?? this.checkoutData.total_amount;

    this.mpesaService.initiateSTKPush(phone, amount, String(orderId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this.isPolling = true;
          this.pollMpesaStatus(orderId, res.CheckoutRequestID);
        },
        error: (err: any) => {
          this.isLoading    = false;
          this.errorMessage = err?.error?.message ?? 'Failed to initiate M-Pesa payment. Please try again.';
        },
      });
  }

  private pollMpesaStatus(orderId: number, checkoutRequestId: string): void {
    let attempts = 0;
    const MAX    = 20;

    interval(3000).pipe(
      switchMap(() => this.mpesaService.queryPaymentStatus(checkoutRequestId)),
      takeWhile(() => attempts < MAX, true),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (res: any) => {
        attempts++;
        const code = res?.ResultCode;
        if (code === '0' || code === 0) {
          this.isPolling = false;
          this.clearStoredPaymentInfo();
          this.cartService.clearCart();
          this.router.navigate(['/orders', orderId]);
        } else if (code !== undefined && code !== null && code !== '') {
          this.isPolling    = false;
          this.errorMessage = 'M-Pesa payment was not completed. Please try again.';
        }
      },
      error: () => {
        if (++attempts >= MAX) {
          this.isPolling    = false;
          this.errorMessage = 'Payment status check timed out. Check your order status in your account.';
        }
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private getReferralCode(): string | null {
    if (!this.isBrowser) return null;
    return sessionStorage.getItem('referral_code');
  }

  private clearStoredPaymentInfo(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem('paymentInfo');
    localStorage.removeItem('payment_data');
  }

  selectMethod(method: 'mpesa' | 'cod'): void {
    this.selectedMethod = method;
    this.errorMessage   = '';
  }

  goBack(): void {
    this.router.navigate(['/checkout/details']);
  }
}
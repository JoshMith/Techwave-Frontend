// src/app/profile/profile.component.ts
// Phase 4.1 — seller role references removed.
// Roles in v2: customer | agent | admin  (no seller)

import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── Loading / error state ──────────────────────────────────────────────────
  isLoading = true;
  error: string | null = null;

  // ── Data ───────────────────────────────────────────────────────────────────
  user: any = null;
  orders: any[] = [];
  addresses: any[] = [];
  payments: any[] = [];

  // ── Section navigation ─────────────────────────────────────────────────────
  activeSection: 'overview' | 'orders' | 'addresses' | 'payments' | 'settings' = 'overview';

  // ── Profile edit ───────────────────────────────────────────────────────────
  isEditingProfile = false;
  editUserData = { name: '', email: '', phone: '' };

  // ── Address management ─────────────────────────────────────────────────────
  showAddAddressForm = false;
  isAddingAddress = false;
  editingAddressId: number | null = null;
  addressSuccess: string | null = null;
  addressError: string | null = null;

  newAddress = this.emptyAddress();
  editAddressData: any = {};

  readonly isBrowser: boolean;

  constructor(
    private apiService: ApiService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadUserData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Load all data ──────────────────────────────────────────────────────────
  loadUserData(): void {
    this.isLoading = true;
    this.error = null;

    this.apiService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.user = res?.user ?? res;
        this.loadOrders();
        this.loadAddresses();
        this.loadPayments();
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load profile. Please try again.';
        this.isLoading = false;
        // Navigate to login after a short delay, since this likely means the user is not authenticated and set redirect url to the profile page after login
        setTimeout(() => this.router.navigate(['/login'], { queryParams: { redirect: '/profile' } }), 3000);

      },
    });
  }

  private loadOrders(): void {
    this.apiService.getOrders().pipe(takeUntil(this.destroy$)).subscribe({
      next: (orders: any[]) => { this.orders = orders ?? []; },
      error: () => { this.orders = []; },
    });
  }

  private loadAddresses(): void {
    this.apiService.getAddresses().pipe(takeUntil(this.destroy$)).subscribe({
      next: (addresses: any[]) => { this.addresses = addresses ?? []; },
      error: () => { this.addresses = []; },
    });
  }

  private loadPayments(): void {
    this.apiService.getPayments().pipe(takeUntil(this.destroy$)).subscribe({
      next: (payments: any[]) => { this.payments = payments ?? []; },
      error: () => { this.payments = []; },
    });
  }

  // ── Section nav ────────────────────────────────────────────────────────────
  setActiveSection(section: typeof this.activeSection): void {
    this.activeSection = section;
  }

  // ── Display helpers ────────────────────────────────────────────────────────
  getUserInitials(): string {
    if (!this.user?.name) return '?';
    return this.user.name
      .split(' ')
      .map((w: string) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getMemberSince(): string {
    if (!this.user?.created_at) return '';
    return new Date(this.user.created_at).toLocaleDateString('en-KE', {
      year: 'numeric', month: 'long',
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  formatCurrency(amount: number): string {
    return `KSh ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  }

  getActiveOrdersCount(): number {
    return this.orders.filter(o =>
      !['delivered', 'cancelled'].includes(o.status?.toLowerCase()),
    ).length;
  }

  getOrderStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'status-pending',
      paid: 'status-paid',
      processing: 'status-processing',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled',
    };
    return map[status?.toLowerCase()] ?? '';
  }

  getPaymentStatusClass(payment: any): string {
    if (payment?.confirmed) return 'status-delivered';
    return payment?.status === 'failed' ? 'status-cancelled' : 'status-pending';
  }

  getOrderItemTotal(item: any): number {
    return (parseFloat(item.unit_price) * item.quantity) - (parseFloat(item.discount) || 0);
  }

  getOrderSubtotal(order: any): number {
    return (order.order_items ?? []).reduce(
      (sum: number, item: any) => sum + parseFloat(item.unit_price) * item.quantity,
      0,
    );
  }

  getOrderDiscountTotal(order: any): number {
    return (order.order_items ?? []).reduce(
      (sum: number, item: any) => sum + (parseFloat(item.discount) || 0),
      0,
    );
  }

  viewOrderDetails(orderId: number): void {
    this.router.navigate(['/orders', orderId]);
  }

  // ── Profile edit ───────────────────────────────────────────────────────────
  toggleEditProfile(): void {
    this.editUserData = {
      name: this.user?.name ?? '',
      email: this.user?.email ?? '',
      phone: this.user?.phone ?? '',
    };
    this.isEditingProfile = true;
  }

  cancelEditProfile(): void {
    this.isEditingProfile = false;
  }

  saveProfile(): void {
    if (!this.user?.user_id) return;

    this.apiService.updateUser(String(this.user.user_id), this.editUserData)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.user = { ...this.user, ...this.editUserData };
          this.isEditingProfile = false;
        },
        error: () => { /* leave form open, user retries */ },
      });
  }

  // ── Addresses ──────────────────────────────────────────────────────────────
  toggleAddAddressForm(): void {
    this.showAddAddressForm = !this.showAddAddressForm;
    if (this.showAddAddressForm) this.newAddress = this.emptyAddress();
    this.addressError = null;
    this.addressSuccess = null;
  }

  addNewAddress(): void {
    this.isAddingAddress = true;
    this.addressError = null;

    this.apiService.createAddress(this.newAddress).pipe(takeUntil(this.destroy$)).subscribe({
      next: (addr: any) => {
        this.addresses.push(addr?.address ?? addr);
        this.showAddAddressForm = false;
        this.isAddingAddress = false;
        this.addressSuccess = 'Address added successfully.';
        setTimeout(() => this.addressSuccess = null, 4000);
      },
      error: (e: any) => {
        this.addressError = e?.error?.message ?? 'Failed to add address.';
        this.isAddingAddress = false;
      },
    });
  }

  startEditAddress(address: any): void {
    this.editingAddressId = address.address_id;
    this.editAddressData = { ...address };
  }

  cancelEditAddress(): void {
    this.editingAddressId = null;
    this.editAddressData = {};
  }

  saveAddress(addressId: number): void {
    this.apiService.updateAddress(String(addressId), this.editAddressData)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          const idx = this.addresses.findIndex(a => a.address_id === addressId);
          if (idx !== -1) this.addresses[idx] = { ...this.addresses[idx], ...this.editAddressData };
          this.editingAddressId = null;
          this.addressSuccess = 'Address updated.';
          setTimeout(() => this.addressSuccess = null, 3000);
        },
        error: (e: any) => { this.addressError = e?.error?.message ?? 'Failed to update address.'; },
      });
  }

  setDefaultAddress(addressId: number): void {
    this.apiService.updateAddress(String(addressId), { is_default: true }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.addresses = this.addresses.map(a => ({
          ...a,
          is_default: a.address_id === addressId,
        }));
        this.addressSuccess = 'Default address updated.';
        setTimeout(() => this.addressSuccess = null, 3000);
      },
      error: (e: any) => { this.addressError = e?.error?.message ?? 'Failed to set default address.'; },
    });
  }

  deleteAddress(addressId: number): void {
    if (!confirm('Delete this address?')) return;

    this.apiService.deleteAddress(String(addressId)).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.addresses = this.addresses.filter(a => a.address_id !== addressId);
        this.addressSuccess = 'Address deleted.';
        setTimeout(() => this.addressSuccess = null, 3000);
      },
      error: (e: any) => { this.addressError = e?.error?.message ?? 'Failed to delete address.'; },
    });
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  logout(): void {
    this.apiService.logout().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (this.isBrowser) localStorage.removeItem('currentUser');
        this.router.navigate(['/home']);
      },
      error: () => {
        if (this.isBrowser) localStorage.removeItem('currentUser');
        this.router.navigate(['/home']);
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private emptyAddress() {
    return {
      full_name: '', phone: '', street: '', building: '',
      city: 'Nairobi', county: 'Nairobi County', state: '',
      postal_code: '', country: 'Kenya',
    };
  }
}
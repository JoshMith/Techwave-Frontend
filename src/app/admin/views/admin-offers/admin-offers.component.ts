// src/app/admin/views/admin-offers/admin-offers.component.ts

import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminApiService } from '../../services/admin-api.service';
import { ApiService } from '../../../services/api.service';
import { formatCurrency, formatDate } from '../../admin-portal.utils';

@Component({
  selector: 'app-admin-offers',
  standalone: true,
  styleUrls: [
    '../../portal-shared.css',
    '../../admin.component.css',
  ],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-offers.component.html',
})
export class AdminOffersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  activeTab: 'sale' | 'special' = 'sale';

  // ── Sale prices ────────────────────────────────────────────────────────────
  allProducts: any[]      = [];
  filteredProducts: any[] = [];
  productSearch = '';
  isLoadingProducts = false;

  // Inline edit state — keyed by product_id
  editing: Record<number, { sale_price: number | null; saving: boolean }> = {};

  // ── Special offers ─────────────────────────────────────────────────────────
  specialOffers: any[] = [];
  isLoadingOffers = false;

  showOfferForm = false;
  offerForm = this.blankOffer();
  isSubmittingOffer = false;
  editingOfferId: number | null = null;

  successMsg: string | null = null;
  errorMsg: string | null   = null;

  readonly fmt     = formatCurrency;
  readonly fmtDate = formatDate;

  constructor(
    private adminApi: AdminApiService,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadSpecialOffers();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Products / sale prices ─────────────────────────────────────────────────

  loadProducts(): void {
    this.isLoadingProducts = true;
    this.adminApi.getProducts().pipe(takeUntil(this.destroy$)).subscribe({
      next: (products) => {
        this.allProducts = products;
        this.applyProductFilter();
        this.isLoadingProducts = false;
      },
      error: () => { this.errorMsg = 'Failed to load products.'; this.isLoadingProducts = false; },
    });
  }

  applyProductFilter(): void {
    const term = this.productSearch.toLowerCase().trim();
    this.filteredProducts = term
      ? this.allProducts.filter(p =>
          (p.title ?? '').toLowerCase().includes(term) ||
          (p.category_name ?? '').toLowerCase().includes(term),
        )
      : [...this.allProducts];
  }

  getDiscountPercent(price: number, salePrice: number | null): number {
    if (!salePrice || salePrice <= 0 || salePrice >= price) {
      return 0;
    }
    return Math.round(((price - salePrice) / price) * 100);
  }


  startEdit(product: any): void {
    this.editing[product.product_id] = {
      sale_price: product.sale_price ?? null,
      saving: false,
    };
  }

  cancelEdit(productId: number): void {
    delete this.editing[productId];
  }

  isEditing(productId: number): boolean {
    return !!this.editing[productId];
  }

  isSaving(productId: number): boolean {
    return this.editing[productId]?.saving || false;
  }

  getEditingSalePrice(product: any): number | null {
    const editState = this.editing[product.product_id];
    return editState ? editState.sale_price : null;
  }

  updateEditingSalePrice(product: any, value: any): void {
    if (this.editing[product.product_id]) {
      this.editing[product.product_id].sale_price = value ? Number(value) : null;
    }
  }

  shouldShowDiscount(product: any): boolean {
    const salePrice = this.getEditingSalePrice(product);
    return salePrice !== null && salePrice > 0 && salePrice < product.price;
  }

  saveSalePrice(product: any): void {
    const state = this.editing[product.product_id];
    if (!state) return;

    // Validate: sale price must be < regular price (or null to clear)
    if (state.sale_price !== null && state.sale_price !== undefined) {
      if (Number(state.sale_price) <= 0) {
        this.errorMsg = 'Sale price must be greater than 0.';
        return;
      }
      if (Number(state.sale_price) >= Number(product.price)) {
        this.errorMsg = 'Sale price must be less than the regular price.';
        return;
      }
    }

    state.saving = true;
    this.errorMsg = null;

    const payload = {
      ...product,
      sale_price: state.sale_price ? Number(state.sale_price) : null,
      specs: typeof product.specs === 'object' ? JSON.stringify(product.specs) : product.specs,
    };

    this.adminApi.updateProduct(String(product.product_id), payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          product.sale_price = state.sale_price ? Number(state.sale_price) : null;
          delete this.editing[product.product_id];
          this.successMsg = `Sale price updated for "${product.title}".`;
          setTimeout(() => (this.successMsg = null), 3000);
        },
        error: (e) => {
          state.saving = false;
          this.errorMsg = e?.error?.message ?? 'Failed to update sale price.';
        },
      });
  }

  clearSalePrice(product: any): void {
    if (!confirm(`Remove sale price from "${product.title}"?`)) return;

    const payload = {
      ...product,
      sale_price: null,
      specs: typeof product.specs === 'object' ? JSON.stringify(product.specs) : product.specs,
    };

    this.adminApi.updateProduct(String(product.product_id), payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          product.sale_price = null;
          this.successMsg = `Sale price removed from "${product.title}".`;
          setTimeout(() => (this.successMsg = null), 3000);
        },
        error: (e) => { this.errorMsg = e?.error?.message ?? 'Failed to clear sale price.'; },
      });
  }

  // ── Special offers ─────────────────────────────────────────────────────────

  loadSpecialOffers(): void {
    this.isLoadingOffers = true;
    this.apiService.getSpecialOffers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.specialOffers = Array.isArray(res) ? res : (res?.data ?? res?.offers ?? []);
        this.isLoadingOffers = false;
      },
      error: () => { this.isLoadingOffers = false; },
    });
  }

  openOfferForm(offer?: any): void {
    this.errorMsg = null;
    if (offer) {
      this.editingOfferId = offer.offer_id ?? offer.special_offer_id ?? offer.id;
      this.offerForm = {
        title:       offer.title       ?? '',
        description: offer.description ?? '',
        discount_value: offer.discount_value ?? offer.discount_percentage ?? 0,
        discount_type: offer.discount_type ?? 'percentage',
        valid_from:  offer.start_date ? offer.start_date.split('T')[0] : '',
        valid_until:    offer.end_date   ? offer.end_date.split('T')[0]   : '',
        is_active:   offer.is_active  ?? true,
      };
    } else {
      this.editingOfferId = null;
      this.offerForm = this.blankOffer();
    }
    this.showOfferForm = true;
  }

  closeOfferForm(): void { this.showOfferForm = false; this.editingOfferId = null; }

  submitOffer(): void {
    if (!this.offerForm.title.trim()) {
      this.errorMsg = 'Offer title is required.';
      return;
    }

    this.isSubmittingOffer = true;
    this.errorMsg = null;

    const action$ = this.editingOfferId
      ? this.apiService.updateSpecialOffer(String(this.editingOfferId), this.offerForm)
      : this.apiService.createSpecialOffer(this.offerForm);

    action$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSubmittingOffer = false;
        this.closeOfferForm();
        this.loadSpecialOffers();
        this.successMsg = this.editingOfferId ? 'Offer updated.' : 'Offer created.';
        setTimeout(() => (this.successMsg = null), 3000);
      },
      error: (e) => {
        this.isSubmittingOffer = false;
        this.errorMsg = e?.error?.message ?? 'Failed to save offer.';
      },
    });
  }

  toggleOfferActive(offer: any): void {
    const newState = !offer.is_active;
    const id = String(offer.offer_id ?? offer.special_offer_id ?? offer.id);

    this.apiService.toggleSpecialOfferActivation(id, newState)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          offer.is_active = newState;
          this.successMsg = `Offer "${offer.title}" ${newState ? 'activated' : 'deactivated'}.`;
          setTimeout(() => (this.successMsg = null), 3000);
        },
        error: (e) => { this.errorMsg = e?.error?.message ?? 'Failed to update offer status.'; },
      });
  }

  deleteOffer(offer: any): void {
    if (!confirm(`Delete offer "${offer.title}"?`)) return;
    const id = String(offer.offer_id ?? offer.special_offer_id ?? offer.id);

    this.apiService.deleteSpecialOffer(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.specialOffers = this.specialOffers.filter(o =>
          String(o.offer_id ?? o.special_offer_id ?? o.id) !== id,
        );
        this.successMsg = 'Offer deleted.';
        setTimeout(() => (this.successMsg = null), 3000);
      },
      error: (e) => { this.errorMsg = e?.error?.message ?? 'Failed to delete offer.'; },
    });
  }

  private blankOffer() {
    return { title: '', description: '', discount_value: 0, discount_type: 'percentage', valid_from: '', valid_until: '', is_active: true };
  }
}
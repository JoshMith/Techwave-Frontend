// src/app/admin/views/orders/admin-order-detail.component.ts

import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminApiService } from '../../services/admin-api.service';
import { formatCurrency, formatDateTime, getStatusClass, getStatusLabel } from '../../admin-portal.utils';

@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  styleUrls: [
    '../../portal-shared.css',
    '../../admin.component.css',
  ],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-order-detail.component.html',
})
export class AdminOrderDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isLoading = true;
  order: any = null;
  error: string | null = null;
  successMsg: string | null = null;

  readonly statuses = ['pending','paid','processing','shipped','delivered','cancelled'];
  readonly fmt = formatCurrency;
  readonly fmtDT = formatDateTime;
  readonly statusClass = getStatusClass;
  readonly statusLabel = getStatusLabel;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private adminApi: AdminApiService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/admin/orders']); return; }
    this.load(id);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(id: string): void {
    this.isLoading = true;
    this.adminApi.getOrderDetails(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.order = res?.data ?? res;
        this.isLoading = false;
      },
      error: (e) => {
        this.error = e?.error?.message ?? 'Failed to load order details.';
        this.isLoading = false;
      },
    });
  }

  updateStatus(status: string): void {
    if (!this.order?.order_id) return;
    this.adminApi.updateOrderStatus(String(this.order.order_id), status)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.order.status = status;
          this.successMsg = `Status updated to ${this.statusLabel(status)}`;
          setTimeout(() => this.successMsg = null, 3000);
        },
        error: (e) => { this.error = e?.error?.message ?? 'Failed to update status.'; },
      });
  }

  confirmCod(): void {
    if (!confirm('Confirm cash payment received?')) return;
    this.adminApi.updateOrderStatus(String(this.order.order_id), 'paid')
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.order.status = 'paid';
          this.successMsg = 'COD payment confirmed — order marked as Paid.';
          setTimeout(() => this.successMsg = null, 4000);
        },
        error: (e) => { this.error = e?.error?.message ?? 'Failed to confirm payment.'; },
      });
  }

  get isCodPending(): boolean {
    return this.order?.payment_method === 'cash_on_delivery' && this.order?.status === 'pending';
  }
}
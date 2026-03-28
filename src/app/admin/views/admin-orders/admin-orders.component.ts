// src/app/admin/views/orders/admin-orders.component.ts

import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminApiService } from '../../services/admin-api.service';
import { formatCurrency, formatDate, getStatusClass, getStatusLabel } from '../../admin-portal.utils';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  styleUrls: [
    '../../portal-shared.css',
    '../../admin.component.css',
  ],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders.component.html',
})
export class AdminOrdersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  allOrders: any[] = [];
  filteredOrders: any[] = [];
  isLoading = false;
  successMsg: string | null = null;
  errorMsg: string | null = null;

  searchTerm = '';
  filterStatus = 'all';

  readonly fmt = formatCurrency;
  readonly fmtDate = formatDate;
  readonly statusClass = getStatusClass;
  readonly statusLabel = getStatusLabel;

  readonly statuses = ['pending','paid','processing','shipped','delivered','cancelled'];

  constructor(private adminApi: AdminApiService, public router: Router) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.isLoading = true;
    this.adminApi.getOrders().pipe(takeUntil(this.destroy$)).subscribe({
      next: (orders) => {
        this.allOrders = orders;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => { this.errorMsg = 'Failed to load orders.'; this.isLoading = false; },
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredOrders = this.allOrders.filter(o => {
      if (this.filterStatus !== 'all' && o.status?.toLowerCase() !== this.filterStatus) return false;
      if (term) {
        const match = `${o.order_id} ${o.customer_name ?? ''} ${o.agent_code ?? ''}`.toLowerCase();
        if (!match.includes(term)) return false;
      }
      return true;
    });
  }

  updateStatus(order: any, status: string): void {
    this.adminApi.updateOrderStatus(String(order.order_id), status)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          order.status = status;
          this.successMsg = `Order #${order.order_id} → ${this.statusLabel(status)}`;
          setTimeout(() => this.successMsg = null, 3000);
        },
        error: (e) => { this.errorMsg = e?.error?.message ?? 'Failed to update status.'; },
      });
  }

  confirmCod(order: any): void {
    if (!confirm(`Confirm cash payment received for Order #${order.order_id}?`)) return;
    // COD confirmation: update order to paid
    this.adminApi.updateOrderStatus(String(order.order_id), 'paid')
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          order.status = 'paid';
          order.payment_method_confirmed = true;
          this.successMsg = `Order #${order.order_id} marked as paid.`;
          setTimeout(() => this.successMsg = null, 3000);
        },
        error: (e) => { this.errorMsg = e?.error?.message ?? 'Failed to confirm payment.'; },
      });
  }

  isCodPending(order: any): boolean {
    return order.payment_method === 'cash_on_delivery' && order.status === 'pending';
  }

  viewDetail(orderId: any): void {
    this.router.navigate(['/admin/orders', orderId]);
  }
}
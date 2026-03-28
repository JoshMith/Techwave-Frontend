// src/app/agent-portal/views/agent-orders/agent-orders.component.ts

import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';

interface CommissionBreakdown {
  category: string;
  item_subtotal: number;
  rate_applied: number;
  amount_earned: number;
}

interface AgentOrder {
  order_id: number;
  total_amount: number;
  commission_total: number;
  status: string;
  payment_method: string;
  created_at: string;
  customer_name: string;
  commission_breakdown: CommissionBreakdown[];
  // UI state
  expanded?: boolean;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Component({
  selector: 'app-agent-orders',
  standalone: true,
  styleUrls: [
    '../../agent-portal-shared.css',
    '../../agent-portal.component.css',
  ],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './agent-orders.component.html',
})
export class AgentOrdersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  orders: AgentOrder[] = [];
  pagination: Pagination = { total: 0, page: 1, limit: 20, totalPages: 1 };
  isLoading = false;
  error: string | null = null;

  constructor(private apiService: ApiService, public router: Router) {}

  ngOnInit(): void { this.load(1); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(page: number): void {
    this.isLoading = true;
    this.error = null;

    this.apiService.getAgentOrders(page, 20).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.orders = (res.orders ?? []).map((o: AgentOrder) => ({ ...o, expanded: false }));
        this.pagination = res.pagination ?? this.pagination;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Failed to load orders.';
        this.isLoading = false;
      },
    });
  }

  toggleExpand(order: AgentOrder): void {
    order.expanded = !order.expanded;
  }

  // ── Status helpers ─────────────────────────────────────────────────────────

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending:    'pending',
      paid:       'delivered',
      processing: 'processing',
      shipped:    'processing',
      delivered:  'delivered',
      cancelled:  'cancelled',
    };
    return map[status?.toLowerCase()] ?? 'pending';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending:    'Pending',
      paid:       'Paid',
      processing: 'Processing',
      shipped:    'Shipped',
      delivered:  'Delivered',
      cancelled:  'Cancelled',
    };
    return map[status?.toLowerCase()] ?? status;
  }

  getPaymentLabel(method: string): string {
    const map: Record<string, string> = {
      mpesa:            'M-Pesa',
      cash_on_delivery: 'Cash on Delivery',
      card:             'Card',
    };
    return map[method] ?? method;
  }

  // ── Formatting ─────────────────────────────────────────────────────────────

  formatAmount(val: number | string | null | undefined): string {
    const n = typeof val === 'string' ? parseFloat(val) : (val ?? 0);
    return `KSh ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  formatRate(rate: number | string): string {
    const n = typeof rate === 'string' ? parseFloat(rate) : rate;
    return `${(n * 100).toFixed(1)}%`;
  }

  isAccessories(category: string): boolean {
    return category?.toLowerCase() === 'accessories';
  }

  // ── Pagination ─────────────────────────────────────────────────────────────

  prevPage(): void {
    if (this.pagination.page > 1) this.load(this.pagination.page - 1);
  }

  nextPage(): void {
    if (this.pagination.page < this.pagination.totalPages) this.load(this.pagination.page + 1);
  }
}
// src/app/admin/views/overview/admin-overview.component.ts

import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AdminApiService } from '../../services/admin-api.service';
import { formatCurrency, formatDate, getStatusClass, getStatusLabel } from '../../admin-portal.utils';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  styleUrls: [
    '../../portal-shared.css',
    '../../admin.component.css',
  ],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './admin-overview.component.html',
})
export class AdminOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isLoading = true;
  error: string | null = null;

  stats: any = null;
  revenueTrend: { month: string; revenue: number }[] = [];
  topProducts: any[] = [];
  topAgents: any[] = [];
  recentOrders: any[] = [];
  lowStock: any[] = [];

  readonly fmt = formatCurrency;
  readonly fmtDate = formatDate;
  readonly statusClass = getStatusClass;
  readonly statusLabel = getStatusLabel;

  constructor(private adminApi: AdminApiService, public router: Router) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      stats:      this.adminApi.getDashboardStats().pipe(catchError(() => of(null))),
      revenue:    this.adminApi.getRevenueTrends(6).pipe(catchError(() => of(null))),
      products:   this.adminApi.getTopProducts(5).pipe(catchError(() => of(null))),
      agents:     this.adminApi.getTopAgents(5).pipe(catchError(() => of(null))),
      orders:     this.adminApi.getRecentOrders(10).pipe(catchError(() => of(null))),
      lowStock:   this.adminApi.getLowStockProducts(5).pipe(catchError(() => of(null))),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ stats, revenue, products, agents, orders, lowStock }) => {
        this.stats       = stats?.data ?? stats;
        this.revenueTrend = revenue?.data ?? revenue ?? [];
        this.topProducts  = products?.data ?? products ?? [];
        this.topAgents    = agents?.data ?? agents ?? [];
        this.recentOrders = orders?.data ?? orders ?? [];
        this.lowStock     = lowStock?.data ?? lowStock ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load dashboard data.';
        this.isLoading = false;
      },
    });
  }

  get maxRevenue(): number {
    if (!this.revenueTrend.length) return 1;
    return Math.max(...this.revenueTrend.map(d => d.revenue), 1);
  }

  barHeight(revenue: number): number {
    return Math.max(4, (revenue / this.maxRevenue) * 180);
  }

  goTo(path: string): void { this.router.navigate([path]); }
}
import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SellerAuthService } from '../../services/seller-auth.service';
import { SellerAnalyticsService, StatCard, PerformanceMetric, AnalyticsData } from '../../services/seller-analytics.service';
import { SellerOrdersService } from '../../services/seller-orders.service';
import { formatCurrency, formatDate } from '../../seller-dashboard.utils';

interface DashboardOrder {
  id: string;
  customer: string;
  product: string;
  amount: string;
  status: string;
  date: string;
  statusClass: string;
}

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  styleUrl: '../../seller-dashboard.component.css',
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './dashboard-overview.component.html',
})
export class DashboardOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isLoading = true;
  error: string | null = null;

  stats: StatCard[] = [];
  recentOrders: DashboardOrder[] = [];
  activities: { icon: string; iconClass: string; text: string; time: string }[] = [];
  performanceMetrics: PerformanceMetric[] = [];
  analyticsData!: AnalyticsData;

  readonly quickActions = [
    { icon: '➕', text: 'Add Product',    path: '/seller-dashboard/add-product' },
    { icon: '📦', text: 'Manage Orders',  path: '/seller-dashboard/orders' },
    { icon: '📊', text: 'View Analytics', path: '/seller-dashboard/analytics' },
    { icon: '🎯', text: 'Create Deal',    path: '/seller-dashboard/promotions' },
  ];

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  constructor(
    public auth: SellerAuthService,
    private analyticsService: SellerAnalyticsService,
    private ordersService: SellerOrdersService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.isLoading = true;
    this.error = null;
    const sellerId = this.auth.sellerId;

    if (!sellerId) {
      this.error = 'Seller profile not found. Please complete your profile first.';
      this.isLoading = false;
      return;
    }

    this.analyticsService
      .loadStats(sellerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.analyticsData = data;
          this.stats = this.analyticsService.buildStatCards(data, formatCurrency);
          this.performanceMetrics = this.analyticsService.buildPerformanceMetrics(data, formatCurrency);
          this.activities = this.analyticsService.buildActivities(data);

          this.recentOrders = data.orders.recent.slice(0, 5).map((o: any) => ({
            id: o.order_id ?? 'N/A',
            customer: o.customer_name ?? 'Unknown',
            product: 'Multiple Items',
            amount: formatCurrency(o.total_amount ?? 0),
            status: this.ordersService.mapStatus(o.status),
            date: formatDate(o.created_at),
            statusClass: this.ordersService.statusClass(o.status),
          }));

          this.isLoading = false;
        },
        error: () => {
          this.error = 'Failed to load dashboard data.';
          this.isLoading = false;
        },
      });
  }

  goTo(path: string): void {
    this.router.navigate([path]);
  }
}
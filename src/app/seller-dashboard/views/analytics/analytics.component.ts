import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SellerAuthService } from '../../services/seller-auth.service';
import { SellerAnalyticsService, AnalyticsData } from '../../services/seller-analytics.service';
import { formatCurrency } from '../../seller-dashboard.utils';

@Component({
  selector: 'app-analytics',
  standalone: true,
  styleUrl: '../../seller-dashboard.component.css',
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  isLoading = true;
  error: string | null = null;
  data!: AnalyticsData;
  readonly formatCurrency = formatCurrency;

  constructor(private auth: SellerAuthService, private analyticsService: SellerAnalyticsService, public router: Router) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.isLoading = true;
    const sellerId = this.auth.sellerId;
    if (!sellerId) { this.error = 'Seller profile not found.'; this.isLoading = false; return; }
    this.analyticsService.loadStats(sellerId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => { this.data = d; this.isLoading = false; },
      error: () => { this.error = 'Failed to load analytics.'; this.isLoading = false; },
    });
  }
}
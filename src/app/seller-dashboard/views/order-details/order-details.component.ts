import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SellerOrdersService, OrderDetails } from '../../services/seller-orders.service';
import { formatCurrency, formatDate } from '../../seller-dashboard.utils';

@Component({
  selector: 'app-order-details',
  standalone: true,
  styleUrl: '../../seller-dashboard.component.css',
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-details.component.html',
})
export class OrderDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isLoading = true;
  details: OrderDetails | null = null;
  error: string | null = null;

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private ordersService: SellerOrdersService
  ) {}

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) { this.router.navigate(['/seller-dashboard/orders']); return; }
    this.load(orderId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(orderId: string): void {
    this.isLoading = true;
    this.ordersService.loadDetails(orderId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (details) => { this.details = details; this.isLoading = false; },
      error: (err) => {
        this.error = err?.error?.message ?? 'Failed to load order details.';
        this.isLoading = false;
      },
    });
  }

  onStatusChange(orderId: string, status: string): void {
    this.ordersService.updateStatus(orderId, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  goBack(): void { this.router.navigate(['/seller-dashboard/orders']); }

  mapStatus(s: string): string { return this.ordersService.mapStatus(s); }
  statusClass(s: string): string { return this.ordersService.statusClass(s); }
}
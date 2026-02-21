import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SellerOrdersService, RawOrder } from '../../services/seller-orders.service';
import { formatCurrency, formatDate } from '../../seller-dashboard.utils';

@Component({
  selector: 'app-manage-orders',
  standalone: true,
  styleUrl: '../../seller-dashboard.component.css',
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-orders.component.html',
})
export class ManageOrdersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  allOrders: RawOrder[] = [];
  filteredOrders: RawOrder[] = [];
  isLoading = false;
  orderFilter = 'all';
  orderSearch = '';

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  constructor(private ordersService: SellerOrdersService, public router: Router) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.isLoading = true;
    this.ordersService.loadAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (orders) => {
        this.allOrders = orders;
        this.filteredOrders = [...orders];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  filterOrders(): void {
    this.filteredOrders = this.ordersService.filter(
      this.allOrders, this.orderFilter, this.orderSearch
    );
  }

  viewOrder(orderId: string): void {
    this.router.navigate(['/seller-dashboard/orders', orderId]);
  }

  mapStatus(s: string): string { return this.ordersService.mapStatus(s); }
  statusClass(s: string): string { return this.ordersService.statusClass(s); }
}
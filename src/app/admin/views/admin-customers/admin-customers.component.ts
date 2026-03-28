// src/app/admin/views/customers/admin-customers.component.ts

import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminApiService } from '../../services/admin-api.service';
import { formatCurrency, formatDate } from '../../admin-portal.utils';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  styleUrls: [
    '../../portal-shared.css',
    '../../admin.component.css',
  ],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-customers.component.html',
})
export class AdminCustomersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  allUsers: any[] = [];
  filteredUsers: any[] = [];
  isLoading = false;
  errorMsg: string | null = null;

  searchTerm = '';

  // Selected customer detail
  selectedCustomer: any = null;
  customerOrders: any[] = [];
  isLoadingOrders = false;

  readonly fmt = formatCurrency;
  readonly fmtDate = formatDate;

  constructor(private adminApi: AdminApiService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.isLoading = true;
    this.adminApi.getUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (users) => {
        // Show all users; filter to customers on the client side
        this.allUsers = users.filter((u: any) =>
          !u.role || u.role.toLowerCase() === 'customer',
        );
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => { this.errorMsg = 'Failed to load customers.'; this.isLoading = false; },
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredUsers = term
      ? this.allUsers.filter(u =>
          `${u.name} ${u.email} ${u.phone ?? ''}`.toLowerCase().includes(term),
        )
      : [...this.allUsers];
  }

  selectCustomer(user: any): void {
    this.selectedCustomer = user;
    this.customerOrders = [];
    this.isLoadingOrders = true;

    this.adminApi.getOrdersByUser(String(user.user_id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orders) => { this.customerOrders = orders; this.isLoadingOrders = false; },
        error: () => { this.isLoadingOrders = false; },
      });
  }

  closeDetail(): void { this.selectedCustomer = null; this.customerOrders = []; }

  get totalSpend(): number {
    return this.customerOrders.reduce((s, o) => s + parseFloat(o.total_amount ?? 0), 0);
  }
}
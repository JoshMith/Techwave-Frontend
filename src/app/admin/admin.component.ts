// src/app/admin/admin.component.ts

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminApiService } from './services/admin-api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isMobileMenuOpen = false;
  isLoading = true;
  isAuthorized = false;
  error: string | null = null;
  userName = 'Admin';

  constructor(private adminApi: AdminApiService, private router: Router) {}

  ngOnInit(): void {
    this.adminApi.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const user = res?.user ?? res;
        if (user?.role?.toLowerCase() === 'admin') {
          this.isAuthorized = true;
          this.userName = user.name ?? 'Admin';
        } else {
          this.isAuthorized = false;
          setTimeout(() => this.router.navigate(['/login']), 800);
        }
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to verify session.';
        this.isLoading = false;
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleMobileMenu(): void { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu(): void  { this.isMobileMenuOpen = false; }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 1024 && this.isMobileMenuOpen) this.closeMobileMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isMobileMenuOpen) this.closeMobileMenu();
  }
}
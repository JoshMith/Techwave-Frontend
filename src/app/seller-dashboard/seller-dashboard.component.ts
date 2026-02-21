import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SellerAuthService } from './services/seller-auth.service';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './seller-dashboard.component.html',
  styleUrl: './seller-dashboard.component.css',
})
export class SellerDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isMobileMenuOpen = false;
  isLoading = true;
  isAuthorized = false;
  isSeller = false;
  error: string | null = null;
  userName = 'Seller';
  userRole = '';
  notificationCount = 0;

  constructor(private auth: SellerAuthService, private router: Router) {}

  ngOnInit(): void {
    this.auth
      .initialize()
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.isLoading = state.isLoading;
        this.isAuthorized = state.isAuthorized;
        this.isSeller = state.isSeller;
        this.userName = state.user?.name ?? 'Seller';
        this.userRole = state.user?.role ?? '';
        this.error = state.error;

        if (state.error?.includes('authenticated') || state.error?.includes('log in')) {
          setTimeout(() => this.router.navigate(['/login']), 1000);
          return;
        }

        if (!state.isLoading && !state.isAuthorized) return;

        // Mirror original: if authorized but no seller profile yet, go to profile view
        if (!state.isLoading && state.isAuthorized && !state.seller) {
          this.router.navigate(['/profile']);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleMobileMenu(): void { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu(): void { this.isMobileMenuOpen = false; }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    if (window.innerWidth > 1024 && this.isMobileMenuOpen) this.closeMobileMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isMobileMenuOpen) this.closeMobileMenu();
  }

  onProfileClick(): void { this.router.navigate(['/profile']); }
  onNotificationClick(): void { /* future notifications */ }
  refreshData(): void { this.auth.initialize().pipe(takeUntil(this.destroy$)).subscribe(); }
}
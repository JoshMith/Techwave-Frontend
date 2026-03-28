// src/app/agent-portal/agent-portal.component.ts

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AgentAuthService } from '../services/agent-auth.service';

@Component({
  selector: 'app-agent-portal',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './agent-portal.component.html',
  styleUrl: './agent-portal.component.css',
})
export class AgentPortalComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isMobileMenuOpen = false;
  isLoading = true;
  isAuthorized = false;
  error: string | null = null;
  userName = 'Agent';
  userRole = '';

  constructor(public auth: AgentAuthService, private router: Router) {}

  ngOnInit(): void {
    this.auth.initialize()
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.isLoading = state.isLoading;
        this.isAuthorized = state.isAuthorized;
        this.userName = state.user?.name ?? 'Agent';
        this.userRole = state.user?.role ?? '';
        this.error = state.error;

        if (!state.isLoading && !state.isAuthorized) {
          setTimeout(() => this.router.navigate(['/agent/login']), 800);
        }
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

  onProfileClick(): void { this.router.navigate(['/profile']); }
}
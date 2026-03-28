// src/app/auth/forgot-pwd/forgot-pwd.component.ts
//
// Phase 4.2 — Forgot password flow.
//
// ⚠️  BACKEND TODO (James Kiarie):
//   The backend has no /auth/forgot-password or /auth/reset-password endpoint yet.
//   This component calls POST /auth/forgot-password with { email }.
//   The backend must:
//     1. Validate the email exists in the users table.
//     2. Generate a time-limited token (e.g. UUID, 1 hour TTL) stored in a
//        password_reset_tokens table (or Redis).
//     3. Email the user a reset link: https://techwaveelectronics.co.ke/reset-password?token=<token>
//     4. Expose POST /auth/reset-password { token, newPassword } to complete the flow.
//   Until that endpoint exists the submit button shows a server-error message.

import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { HeaderComponent } from '../../shared/header/header.component';
import { FooterComponent } from '../../shared/footer/footer.component';

type Step = 'email' | 'sent';

@Component({
  selector: 'app-forgot-pwd',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './forgot-pwd.component.html',
  styleUrls: ['./forgot-pwd.component.css'],
})
export class ForgotPwdComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  step: Step = 'email';
  email      = '';
  isLoading  = false;
  errorMsg: string | null  = null;
  successMsg: string | null = null;

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    const trimmed = this.email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      this.errorMsg = 'Please enter a valid email address.';
      return;
    }

    this.isLoading = true;
    this.errorMsg  = null;

    // POST /auth/forgot-password — backend endpoint not yet implemented.
    // When James adds the endpoint this call will work automatically.
    this.apiService.forgotPassword(trimmed)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.step = 'sent';
        },
        error: (err: any) => {
          this.isLoading = false;
          // 404 means endpoint doesn't exist yet — surface a friendly message
          if (err?.status === 404 || err?.status === 0) {
            this.errorMsg = 'Password reset is not yet available. Please contact support.';
          } else {
            // Any other error (e.g. email not found) — still show the generic message
            // to avoid leaking whether an email exists in our system.
            this.step = 'sent';
          }
        },
      });
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }
}
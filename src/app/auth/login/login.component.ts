// src/app/auth/login/login.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AuthDraftService } from '../../services/auth-draft.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  showPassword     = false;
  passwordFieldType = 'password';
  isLoading        = false;
  loginMessage     = '';
  errorMessage     = '';
  returnUrl: string = '/home';
  draftRestored    = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private draftService: AuthDraftService,
  ) {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';

    // Restore draft email
    const draft = this.draftService.getLoginDraft();
    if (draft?.email) {
      this.loginForm.patchValue({ email: draft.email });
      this.draftRestored = true;
      setTimeout(() => (this.draftRestored = false), 3000);
    }

    // Auto-save email (debounced)
    this.loginForm.get('email')!.valueChanges.pipe(
      debounceTime(400),
      takeUntil(this.destroy$),
    ).subscribe(email => this.draftService.saveLoginDraft({ email }));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePassword(): void {
    this.showPassword      = !this.showPassword;
    this.passwordFieldType = this.showPassword ? 'text' : 'password';
  }

  onSubmit(): void {
    if (!this.loginForm.valid) return;

    this.isLoading   = true;
    this.errorMessage = '';

    this.apiService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading    = false;
        this.loginMessage = 'Login successful! Redirecting...';

        this.draftService.clearLoginDraft();

        if (response.user) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
        }

        if (response.user?.role === 'seller') {
          sessionStorage.setItem('sellerData', JSON.stringify(response.sellerData || {}));
        }

        // ── Role-based redirect ────────────────────────────────────────
        this.redirectByRole(response.user?.role, this.returnUrl);
      },
      error: (error) => {
        this.isLoading   = false;
        this.errorMessage = error.error?.message || 'Login failed. Please check your credentials.';
      },
    });
  }

  /** Navigate to the correct portal based on user role. */
  private redirectByRole(role: string | undefined, fallback: string): void {
    const r = (role ?? '').toLowerCase();
    if      (r === 'admin')  this.router.navigate(['/admin/overview']);
    else if (r === 'agent')  this.router.navigate(['/agent/dashboard']);
    else                     this.router.navigateByUrl(fallback);
  }

  showForgotPassword(): void { this.router.navigate(['/forgot-pwd']); }
  showSignup(): void         { this.router.navigate(['/signup']); }

  loginWithGoogle(): void {
    this.isLoading    = true;
    this.loginMessage = 'Redirecting to Google...';
    const googleAuthUrl = `${this.apiService.apiUrl}/auth/google?returnUrl=${encodeURIComponent(this.returnUrl)}`;
    window.location.href = googleAuthUrl;
  }
}
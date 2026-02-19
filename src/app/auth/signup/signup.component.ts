// src/app/auth/signup/signup.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AuthDraftService } from '../../services/auth-draft.service';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit, OnDestroy {
  signupForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;
  isLoading = false;
  signupMessage = '';
  errorMessage = '';

  /** Shows the "draft restored" banner for 3 seconds */
  draftRestored = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiService: ApiService,
    private draftService: AuthDraftService
  ) {
    this.signupForm = this.fb.group({
      name:            ['', Validators.required],
      email:           ['', [Validators.required, Validators.email]],
      phone:           ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      terms:           [false, Validators.requiredTrue],
      newsletter:      [false]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // ── Restore draft ──────────────────────────────────
    const draft = this.draftService.getSignupDraft();
    if (draft && (draft.name || draft.email || draft.phone)) {
      this.signupForm.patchValue({
        name:       draft.name       ?? '',
        email:      draft.email      ?? '',
        phone:      draft.phone      ?? '',
        newsletter: draft.newsletter ?? false,
      });
      this.draftRestored = true;
      setTimeout(() => this.draftRestored = false, 3000);
    }

    // ── Auto-save non-sensitive fields (debounced 400 ms) ──
    const fieldsToWatch = ['name', 'email', 'phone', 'newsletter'];
    fieldsToWatch.forEach(field => {
      this.signupForm.get(field)!.valueChanges.pipe(
        debounceTime(400),
        takeUntil(this.destroy$)
      ).subscribe(() => this.saveDraft());
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private saveDraft(): void {
    this.draftService.saveSignupDraft({
      name:       this.signupForm.value.name,
      email:      this.signupForm.value.email,
      phone:      this.signupForm.value.phone,
      newsletter: this.signupForm.value.newsletter,
    });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  togglePassword(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  onSubmit(): void {
    if (this.signupForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = '';

      const userData = {
        name:       this.signupForm.value.name,
        email:      this.signupForm.value.email,
        phone:      '+254' + this.signupForm.value.phone,
        password:   this.signupForm.value.password,
        terms:      this.signupForm.value.terms,
        newsletter: this.signupForm.value.newsletter
      };

      this.apiService.register(userData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.signupMessage = `Account created for ${userData.email}! Welcome to TechWave Kenya!`;

          // Clear draft — no longer needed after successful registration
          this.draftService.clearSignupDraft();

          setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
        }
      });
    }
  }

  showTerms():  void { this.router.navigate(['/termsofservice']); }
  showPrivacy(): void { this.router.navigate(['/privacypolicy']); }
  showLogin():  void { this.router.navigate(['/login']); }

  signupWithGoogle(): void {
    this.isLoading = true;
    this.signupMessage = 'Redirecting to Google...';
    window.location.href = `${this.apiService.apiUrl}/auth/google`;
  }
}
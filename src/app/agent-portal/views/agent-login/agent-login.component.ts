// src/app/agent-portal/views/agent-login/agent-login.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';
import { AuthDraftService } from '../../../services/auth-draft.service';

@Component({
  selector: 'app-agent-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './agent-login.component.html',
  styleUrl: './agent-login.component.css',
})
export class AgentLoginComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private draftService: AuthDraftService,
  ) {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    // Restore draft email if any
    const draft = this.draftService.getLoginDraft();
    if (draft?.email) {
      this.loginForm.patchValue({ email: draft.email });
    }

    // Auto-save email changes
    this.loginForm.get('email')!.valueChanges.pipe(
      debounceTime(400),
      takeUntil(this.destroy$),
    ).subscribe(email => this.draftService.saveLoginDraft({ email }));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePassword(): void { this.showPassword = !this.showPassword; }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.login(this.loginForm.value).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const role = response.user?.role?.toLowerCase();

        if (role !== 'agent' && role !== 'admin') {
          this.errorMessage = 'This portal is for TechWave agents only. Please use the main store login.';
          return;
        }

        if (response.user) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
        }

        this.draftService.clearLoginDraft();
        this.router.navigate(['/agent/dashboard']);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Login failed. Please check your credentials.';
      },
    });
  }
}
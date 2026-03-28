// src/app/admin/views/settings/admin-settings.component.ts

import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminApiService } from '../../services/admin-api.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  styleUrls: [
    '../../portal-shared.css',
    '../../admin.component.css',
  ],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.component.html',
})
export class AdminSettingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: any = null;
  isLoading = true;
  isSavingProfile = false;
  isSavingPassword = false;
  successMsg: string | null = null;
  errorMsg: string | null = null;

  // Profile edit
  isEditingProfile = false;
  profileForm = { name: '', email: '', phone: '' };

  // Password change
  passwordForm = { newPassword: '', confirmPassword: '' };
  showNewPw = false;
  showConfirmPw = false;

  constructor(private adminApi: AdminApiService) {}

  ngOnInit(): void {
    this.adminApi.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.currentUser = res?.user ?? res;
        this.isLoading = false;
      },
      error: () => { this.errorMsg = 'Failed to load profile.'; this.isLoading = false; },
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  startEditProfile(): void {
    this.profileForm = {
      name:  this.currentUser?.name  ?? '',
      email: this.currentUser?.email ?? '',
      phone: this.currentUser?.phone ?? '',
    };
    this.isEditingProfile = true;
    this.errorMsg = null;
  }

  cancelEditProfile(): void { this.isEditingProfile = false; }

  saveProfile(): void {
    if (!this.profileForm.name.trim() || !this.profileForm.email.trim()) {
      this.errorMsg = 'Name and email are required.';
      return;
    }

    this.isSavingProfile = true;
    this.errorMsg = null;

    this.adminApi.updateAdminProfile(String(this.currentUser.user_id), this.profileForm)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.currentUser = { ...this.currentUser, ...this.profileForm };
          this.isEditingProfile = false;
          this.isSavingProfile = false;
          this.successMsg = 'Profile updated successfully.';
          setTimeout(() => this.successMsg = null, 4000);
        },
        error: (e) => {
          this.errorMsg = e?.error?.message ?? 'Failed to update profile.';
          this.isSavingProfile = false;
        },
      });
  }

  savePassword(): void {
    if (this.passwordForm.newPassword.length < 8) {
      this.errorMsg = 'Password must be at least 8 characters.';
      return;
    }
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.errorMsg = 'Passwords do not match.';
      return;
    }

    this.isSavingPassword = true;
    this.errorMsg = null;

    this.adminApi.changePassword(String(this.currentUser.user_id), this.passwordForm.newPassword)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.passwordForm = { newPassword: '', confirmPassword: '' };
          this.isSavingPassword = false;
          this.successMsg = 'Password updated successfully.';
          setTimeout(() => this.successMsg = null, 4000);
        },
        error: (e) => {
          this.errorMsg = e?.error?.message ?? 'Failed to update password.';
          this.isSavingPassword = false;
        },
      });
  }

  get passwordStrength(): number {
    const pw = this.passwordForm.newPassword;
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  get passwordStrengthColor(): string {
    const s = this.passwordStrength;
    if (s <= 1) return '#ef4444';
    if (s <= 3) return '#f59e0b';
    return '#10b981';
  }

  get passwordStrengthLabel(): string {
    const s = this.passwordStrength;
    if (s <= 1) return 'Weak';
    if (s <= 3) return 'Moderate';
    return 'Strong';
  }
}
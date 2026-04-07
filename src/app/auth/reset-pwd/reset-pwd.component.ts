// src/app/auth/reset-pwd/reset-pwd.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { HeaderComponent } from '../../shared/header/header.component';
import { FooterComponent } from '../../shared/footer/footer.component';

@Component({
  selector: 'app-reset-pwd',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './reset-pwd.component.html',
  styleUrls: ['./reset-pwd.component.css'],
})
export class ResetPwdComponent implements OnInit {
  token: string = '';
  password: string = '';
  confirmPassword: string = '';
  isLoading = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.errorMsg = 'Invalid reset link. Please request a new one.';
    }
  }

  submit() {
    if (!this.token) {
      this.errorMsg = 'Invalid reset link';
      return;
    }

    if (this.password.length < 6) {
      this.errorMsg = 'Password must be at least 6 characters';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMsg = 'Passwords do not match';
      return;
    }

    this.isLoading = true;
    this.errorMsg = null;

    this.apiService.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMsg = 'Password reset successful! You can now login.';
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err.error?.message || 'Failed to reset password. Please try again.';
      }
    });
  }
}
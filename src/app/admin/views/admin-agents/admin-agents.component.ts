// src/app/admin/views/agents/admin-agents.component.ts

import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminApiService } from '../../services/admin-api.service';
import { formatCurrency, formatDate } from '../../admin-portal.utils';

@Component({
  selector: 'app-admin-agents',
  standalone: true,
  styleUrls: [
    '../../portal-shared.css',
    '../../admin.component.css',
  ],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-agents.component.html',
})
export class AdminAgentsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  agents: any[] = [];
  isLoading = false;
  isSubmitting = false;
  successMsg: string | null = null;
  errorMsg: string | null = null;

  // Tabs: 'list' | 'create' | 'report'
  activeTab: 'list' | 'create' | 'report' = 'list';

  // Create agent form
  newAgent = this.emptyAgent();
  showPassword = false;

  // Commission report
  reportFilters = { from: '', to: '', agent_id: '' };
  reportData: any[] = [];
  isLoadingReport = false;

  readonly fmt = formatCurrency;
  readonly fmtDate = formatDate;

  constructor(private adminApi: AdminApiService) {}

  ngOnInit(): void { this.loadAgents(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  loadAgents(): void {
    this.isLoading = true;
    this.adminApi.getAgents().pipe(takeUntil(this.destroy$)).subscribe({
      next: (agents) => { this.agents = agents; this.isLoading = false; },
      error: () => { this.errorMsg = 'Failed to load agents.'; this.isLoading = false; },
    });
  }

  // ── Create agent ───────────────────────────────────────────────────────────
  submitCreate(): void {
    const err = this.validateAgent(this.newAgent);
    if (err) { this.errorMsg = err; return; }

    this.isSubmitting = true;
    this.errorMsg = null;

    this.adminApi.createAgent(this.newAgent).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const agent = res.agent ?? res;
        this.successMsg = `Agent ${agent.full_name} (${agent.agent_code}) created. Referral link: ${agent.referral_link}`;
        this.newAgent = this.emptyAgent();
        this.isSubmitting = false;
        this.activeTab = 'list';
        this.loadAgents();
        setTimeout(() => this.successMsg = null, 8000);
      },
      error: (e) => {
        this.errorMsg = e?.error?.message ?? 'Failed to create agent.';
        this.isSubmitting = false;
      },
    });
  }

  // ── Deactivate agent ───────────────────────────────────────────────────────
  deactivate(agent: any): void {
    if (!confirm(`Deactivate ${agent.full_name} (${agent.agent_code})?\n\nTheir referral link will stop working immediately. Historical commissions are retained.`)) return;

    this.adminApi.deactivateAgent(String(agent.agent_id)).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        agent.is_active = false;
        this.successMsg = `${agent.full_name} has been deactivated.`;
        setTimeout(() => this.successMsg = null, 4000);
      },
      error: (e) => { this.errorMsg = e?.error?.message ?? 'Failed to deactivate agent.'; },
    });
  }

  // ── Commission report ──────────────────────────────────────────────────────
  loadReport(): void {
    this.isLoadingReport = true;
    this.adminApi.getCommissionReport(this.reportFilters)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          this.reportData = res?.data ?? res ?? [];
          this.isLoadingReport = false;
        },
        error: () => { this.errorMsg = 'Failed to load commission report.'; this.isLoadingReport = false; },
      });
  }

  clearReport(): void {
    this.reportFilters = { from: '', to: '', agent_id: '' };
    this.reportData = [];
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private emptyAgent() {
    return { full_name: '', phone: '', id_number: '', email: '', password: '' };
  }

  private validateAgent(a: typeof this.newAgent): string | null {
    if (!a.full_name.trim())  return 'Full name is required.';
    if (!a.phone.trim())      return 'Phone number is required.';
    if (!a.id_number.trim())  return 'ID number is required.';
    if (!a.email.trim())      return 'Email is required.';
    if (!a.password.trim() || a.password.length < 8) return 'Password must be at least 8 characters.';
    return null;
  }

  copyLink(link: string): void {
    navigator.clipboard.writeText(link).catch(() => {});
  }

  get totalCommissionAllAgents(): number {
    return this.reportData.reduce((sum, a) => sum + parseFloat(a.total_commission ?? 0), 0);
  }
}
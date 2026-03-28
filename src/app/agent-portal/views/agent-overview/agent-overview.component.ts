// src/app/agent-portal/views/agent-overview/agent-overview.component.ts

import {
  Component, OnInit, OnDestroy, ViewEncapsulation,
  Inject, PLATFORM_ID, ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AgentAuthService } from '../../../services/agent-auth.service';
import { ApiService } from '../../../services/api.service';

interface DashboardData {
  agent: {
    agent_id: number;
    agent_code: string;
    full_name: string;
    referral_link: string;
  };
  all_time: {
    total_orders: number;
    total_revenue: number;
    total_commission: number;
    unique_customers: number;
  };
  this_month: {
    total_orders: number;
    total_revenue: number;
    total_commission: number;
  };
}

@Component({
  selector: 'app-agent-overview',
  standalone: true,
  styleUrls: [
    '../../agent-portal-shared.css',
    '../../agent-portal.component.css',
  ],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './agent-overview.component.html',
})
export class AgentOverviewComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;

  isLoading = true;
  error: string | null = null;
  data: DashboardData | null = null;
  activePeriod: 'all_time' | 'this_month' = 'this_month';

  copySuccess = false;
  qrReady = false;
  private isBrowser: boolean;

  constructor(
    public auth: AgentAuthService,
    private apiService: ApiService,
    public router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void { this.load(); }

  ngAfterViewInit(): void {
    // QR rendered after data loads — see generateQR()
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.isLoading = true;
    this.error = null;

    this.apiService.getAgentDashboard().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: DashboardData) => {
        this.data = res;
        this.isLoading = false;
        // Give Angular one tick to render the canvas element
        setTimeout(() => this.generateQR(), 50);
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Failed to load dashboard data.';
        this.isLoading = false;
      },
    });
  }

  // ── Referral link helpers ──────────────────────────────────────────────────

  copyLink(): void {
    if (!this.isBrowser || !this.data?.agent.referral_link) return;
    navigator.clipboard.writeText(this.data.agent.referral_link).then(() => {
      this.copySuccess = true;
      setTimeout(() => (this.copySuccess = false), 2500);
    });
  }

  downloadQR(): void {
    if (!this.qrCanvas?.nativeElement) return;
    const link = document.createElement('a');
    link.href = this.qrCanvas.nativeElement.toDataURL('image/png');
    link.download = `TechWave-${this.data?.agent.agent_code ?? 'agent'}-QR.png`;
    link.click();
  }

  private async generateQR(): Promise<void> {
    if (!this.isBrowser || !this.data?.agent.referral_link || !this.qrCanvas?.nativeElement) return;

    try {
      // Dynamic import — qrcode must be installed: npm install qrcode
      const QRCode = (await import('qrcode')).default;
      await QRCode.toCanvas(this.qrCanvas.nativeElement, this.data.agent.referral_link, {
        width: 200,
        margin: 2,
        color: { dark: '#1e3a8a', light: '#ffffff' },
      });
      this.qrReady = true;
    } catch {
      // qrcode not installed or canvas unavailable — silent fallback
      this.qrReady = false;
    }
  }

  // ── Stats helpers ──────────────────────────────────────────────────────────

  get currentPeriod() {
    return this.activePeriod === 'this_month' ? this.data?.this_month : this.data?.all_time;
  }

  formatAmount(val: number | string | null | undefined): string {
    const n = typeof val === 'string' ? parseFloat(val) : (val ?? 0);
    return `KSh ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
  }
}
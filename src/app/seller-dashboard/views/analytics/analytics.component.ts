import { Component, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SellerAuthService } from '../../services/seller-auth.service';
import { SellerAnalyticsService, AnalyticsData } from '../../services/seller-analytics.service';
import { formatCurrency } from '../../seller-dashboard.utils';

@Component({
  selector: 'app-analytics',
  standalone: true,
  styleUrl: '../../seller-dashboard.component.css',
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics.component.html',
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  isLoading = true;
  error: string | null = null;
  data!: AnalyticsData;
  readonly formatCurrency = formatCurrency;

  exportSuccess: string | null = null;
  selectedReport: 'full' | 'revenue' | 'orders' | 'products' | 'topProducts' = 'full';

  constructor(
    private auth: SellerAuthService,
    private analyticsService: SellerAnalyticsService,
    public router: Router
  ) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.isLoading = true;
    const sellerId = this.auth.sellerId;
    if (!sellerId) { this.error = 'Seller profile not found.'; this.isLoading = false; return; }
    this.analyticsService.loadStats(sellerId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => { this.data = d; this.isLoading = false; },
      error: () => { this.error = 'Failed to load analytics.'; this.isLoading = false; },
    });
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────

  exportCSV(): void {
    if (!this.data) return;
    const sections = this.buildCSVSections();
    const csv = sections.join('\n\n');
    this.downloadFile(csv, `techwave-report-${this.selectedReport}-${this.dateStamp()}.csv`, 'text/csv');
    this.showExportSuccess('CSV');
  }

  private buildCSVSections(): string[] {
    const d = this.data;
    const sections: string[] = [];

    if (this.selectedReport === 'full' || this.selectedReport === 'revenue') {
      sections.push(
        'REVENUE SUMMARY',
        `Total Revenue,${formatCurrency(d.revenue.total)}`,
        `Last 30 Days,${formatCurrency(d.revenue.last30Days)}`,
        '',
        'MONTHLY TREND',
        'Month,Revenue (KSh)',
        ...d.revenue.monthlyTrend.map(r => `${r.month},${r.revenue}`)
      );
    }

    if (this.selectedReport === 'full' || this.selectedReport === 'orders') {
      sections.push(
        'ORDER BREAKDOWN',
        'Status,Count',
        `Total,${d.orders.total}`,
        `Pending,${d.orders.pending}`,
        `Processing,${d.orders.processing}`,
        `Shipped,${d.orders.shipped}`,
        `Delivered,${d.orders.delivered}`,
        `Cancelled,${d.orders.cancelled}`
      );
    }

    if (this.selectedReport === 'full' || this.selectedReport === 'products') {
      sections.push(
        'INVENTORY',
        'Metric,Value',
        `Total Products,${d.products.total}`,
        `In Stock,${d.products.inStock}`,
        `Out of Stock,${d.products.outOfStock}`,
        '',
        'LOW STOCK ITEMS',
        'Product,Stock Remaining',
        ...d.products.lowStock.map((p: any) => `"${p.title}",${p.stock}`)
      );
    }

    if (this.selectedReport === 'full' || this.selectedReport === 'topProducts') {
      sections.push(
        'TOP SELLING PRODUCTS',
        'Rank,Product,Units Sold,Revenue (KSh)',
        ...d.topProducts.map((p, i) => `${i + 1},"${p.name}",${p.sales},${p.revenue}`)
      );
    }

    if (this.selectedReport === 'full') {
      sections.push(
        'CUSTOMER & REVIEW STATS',
        'Metric,Value',
        `Total Orders,${d.orders.total}`,
        `Average Rating,${d.reviews.averageRating}/5`,
        `Total Reviews,${d.reviews.total}`,
        `Customer Satisfaction,${d.customerStats.customerSatisfaction.toFixed(1)}/5.0`
      );
    }

    return sections;
  }

  // ── Export PDF ──────────────────────────────────────────────────────────────

  exportPDF(): void {
    if (!this.data) return;
    const html = this.buildPDFHTML();
    const win = window.open('', '_blank');
    if (!win) { this.error = 'Popup blocked — please allow popups and try again.'; return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
    this.showExportSuccess('PDF');
  }

  private buildPDFHTML(): string {
    const d = this.data;
    const title = `TechWave Analytics Report — ${new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}`;

    const revRows = d.revenue.monthlyTrend
      .map(r => `<tr><td>${r.month}</td><td>${formatCurrency(r.revenue)}</td></tr>`).join('');

    const topRows = d.topProducts
      .map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.sales}</td><td>${formatCurrency(p.revenue)}</td></tr>`).join('');

    const lowStockRows = d.products.lowStock
      .map((p: any) => `<tr><td>${p.title}</td><td style="color:#dc2626;font-weight:600;">${p.stock} left</td></tr>`).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${title}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1f2937; padding:2rem; }
      h1 { font-size:1.75rem; font-weight:700; color:#1e3a8a; margin-bottom:0.25rem; }
      .subtitle { color:#6b7280; font-size:0.9rem; margin-bottom:2rem; }
      h2 { font-size:1.1rem; font-weight:700; color:#1e3a8a; border-bottom:2px solid #e5e7eb; padding-bottom:0.5rem; margin:1.5rem 0 0.75rem; }
      .summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:1.5rem; }
      .summary-card { background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; padding:1rem; text-align:center; }
      .summary-card .label { font-size:0.8rem; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem; }
      .summary-card .value { font-size:1.4rem; font-weight:700; color:#1f2937; }
      table { width:100%; border-collapse:collapse; font-size:0.9rem; }
      th { background:#f8fafc; color:#6b7280; text-align:left; padding:0.6rem 0.75rem; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em; border-bottom:2px solid #e5e7eb; }
      td { padding:0.6rem 0.75rem; border-bottom:1px solid #f3f4f6; }
      tr:last-child td { border-bottom:none; }
      .orders-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:0.5rem; }
      .order-cell { background:#f9fafb; border-radius:6px; padding:0.75rem; text-align:center; }
      .order-cell .status { font-size:0.8rem; color:#6b7280; text-transform:uppercase; margin-bottom:0.25rem; }
      .order-cell .count { font-size:1.5rem; font-weight:700; color:#1f2937; }
      .footer { margin-top:2rem; padding-top:1rem; border-top:1px solid #e5e7eb; color:#9ca3af; font-size:0.8rem; }
      @media print { body { padding:1rem; } }
    </style></head><body>
    <h1>📊 TechWave Analytics Report</h1>
    <div class="subtitle">Generated on ${title.split('—')[1].trim()} · Report type: ${this.selectedReport === 'full' ? 'Full Report' : this.selectedReport}</div>

    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Total Revenue</div><div class="value">${formatCurrency(d.revenue.total)}</div></div>
      <div class="summary-card"><div class="label">Total Orders</div><div class="value">${d.orders.total}</div></div>
      <div class="summary-card"><div class="label">Avg Rating</div><div class="value">⭐ ${d.reviews.averageRating}/5</div></div>
      <div class="summary-card"><div class="label">Last 30 Days Revenue</div><div class="value">${formatCurrency(d.revenue.last30Days)}</div></div>
      <div class="summary-card"><div class="label">Active Products</div><div class="value">${d.products.inStock}</div></div>
      <div class="summary-card"><div class="label">Total Reviews</div><div class="value">${d.reviews.total}</div></div>
    </div>

    ${(this.selectedReport === 'full' || this.selectedReport === 'orders') ? `
    <h2>Order Breakdown</h2>
    <div class="orders-grid">
      <div class="order-cell"><div class="status">Pending</div><div class="count">${d.orders.pending}</div></div>
      <div class="order-cell"><div class="status">Processing</div><div class="count">${d.orders.processing}</div></div>
      <div class="order-cell"><div class="status">Shipped</div><div class="count">${d.orders.shipped}</div></div>
      <div class="order-cell"><div class="status">Delivered</div><div class="count">${d.orders.delivered}</div></div>
      <div class="order-cell"><div class="status">Cancelled</div><div class="count">${d.orders.cancelled}</div></div>
    </div>` : ''}

    ${(this.selectedReport === 'full' || this.selectedReport === 'revenue') && revRows ? `
    <h2>Monthly Revenue Trend</h2>
    <table><thead><tr><th>Month</th><th>Revenue</th></tr></thead><tbody>${revRows}</tbody></table>` : ''}

    ${(this.selectedReport === 'full' || this.selectedReport === 'topProducts') && topRows ? `
    <h2>Top Selling Products</h2>
    <table><thead><tr><th>Rank</th><th>Product</th><th>Units Sold</th><th>Revenue</th></tr></thead><tbody>${topRows}</tbody></table>` : ''}

    ${(this.selectedReport === 'full' || this.selectedReport === 'products') ? `
    <h2>Inventory</h2>
    <table><thead><tr><th>Metric</th><th>Count</th></tr></thead><tbody>
      <tr><td>Total Products</td><td>${d.products.total}</td></tr>
      <tr><td>In Stock</td><td style="color:#059669;font-weight:600;">${d.products.inStock}</td></tr>
      <tr><td>Out of Stock</td><td style="color:#dc2626;font-weight:600;">${d.products.outOfStock}</td></tr>
    </tbody></table>
    ${lowStockRows ? `<h2>Low Stock Alerts</h2><table><thead><tr><th>Product</th><th>Stock</th></tr></thead><tbody>${lowStockRows}</tbody></table>` : ''}` : ''}

    <div class="footer">TechWave Kenya · techwave.co.ke · Generated by TechWave Seller Dashboard</div>
    </body></html>`;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private dateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private showExportSuccess(type: string): void {
    this.exportSuccess = `${type} exported successfully!`;
    setTimeout(() => (this.exportSuccess = null), 3000);
  }
}
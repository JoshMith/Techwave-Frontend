import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

export interface AnalyticsData {
  revenue: {
    total: number;
    last30Days: number;
    monthlyTrend: { month: string; revenue: number }[];
  };
  orders: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    recent: any[];
  };
  products: {
    total: number;
    inStock: number;
    outOfStock: number;
    lowStock: any[];
  };
  reviews: {
    total: number;
    averageRating: string;
  };
  topProducts: { name: string; sales: number; revenue: number }[];
  customerStats: { totalCustomers: number; customerSatisfaction: number };
}

export interface StatCard {
  title: string;
  value: string;
  change: string;
  changeClass: string;
  icon: string;
  iconClass: string;
}

export interface PerformanceMetric {
  label: string;
  value: string;
  valueClass?: string;
}

const EMPTY: AnalyticsData = {
  revenue: { total: 0, last30Days: 0, monthlyTrend: [] },
  orders: { total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, recent: [] },
  products: { total: 0, inStock: 0, outOfStock: 0, lowStock: [] },
  reviews: { total: 0, averageRating: '0' },
  topProducts: [],
  customerStats: { totalCustomers: 0, customerSatisfaction: 0 },
};

@Injectable({ providedIn: 'root' })
export class SellerAnalyticsService {
  constructor(private api: ApiService) {}

  loadStats(sellerId: string): Observable<AnalyticsData> {
    return this.api.getSellerDashboardStats(sellerId).pipe(
      map((response) => {
        if (!response?.success || !response?.data) return EMPTY;
        const d = response.data;
        return {
          revenue: {
            total: d.revenue?.total ?? 0,
            last30Days: d.revenue?.last30Days ?? 0,
            monthlyTrend: d.revenue?.monthlyTrend ?? [],
          },
          orders: {
            total: d.orders?.total ?? 0,
            pending: d.orders?.pending ?? 0,
            processing: d.orders?.processing ?? 0,
            shipped: d.orders?.shipped ?? 0,
            delivered: d.orders?.delivered ?? 0,
            cancelled: d.orders?.cancelled ?? 0,
            recent: d.orders?.recent ?? [],
          },
          products: {
            total: d.products?.total ?? 0,
            inStock: d.products?.inStock ?? 0,
            outOfStock: d.products?.outOfStock ?? 0,
            lowStock: d.products?.lowStock ?? [],
          },
          reviews: {
            total: d.reviews?.total ?? 0,
            averageRating: d.reviews?.averageRating ?? '0',
          },
          topProducts: (d.topProducts ?? []).map((p: any) => ({
            name: p.title,
            sales: p.unitsSold ?? 0,
            revenue: p.revenue ?? 0,
          })),
          customerStats: {
            totalCustomers: d.orders?.total ?? 0,
            customerSatisfaction: parseFloat(d.reviews?.averageRating ?? '0'),
          },
        } as AnalyticsData;
      }),
      catchError(() => of(EMPTY))
    );
  }

  buildStatCards(data: AnalyticsData, fmt: (n: number) => string): StatCard[] {
    return [
      {
        title: 'Total Revenue',
        value: fmt(data.revenue.total),
        change: `Last 30 days: ${fmt(data.revenue.last30Days)}`,
        changeClass: data.revenue.last30Days > 0 ? 'positive' : 'warning',
        icon: '💰',
        iconClass: 'revenue',
      },
      {
        title: 'Total Orders',
        value: String(data.orders.total),
        change: `${data.orders.pending} pending • ${data.orders.processing} processing`,
        changeClass: data.orders.total > 0 ? 'positive' : 'warning',
        icon: '📦',
        iconClass: 'orders',
      },
      {
        title: 'Active Products',
        value: String(data.products.total),
        change: `${data.products.inStock} in stock • ${data.products.outOfStock} out`,
        changeClass: data.products.inStock > 0 ? 'positive' : 'warning',
        icon: '📱',
        iconClass: 'products',
      },
      {
        title: 'Customer Reviews',
        value: `${data.reviews.averageRating}/5`,
        change: `${data.reviews.total} total reviews`,
        changeClass: parseFloat(data.reviews.averageRating) >= 4 ? 'positive' : 'warning',
        icon: '⭐',
        iconClass: 'customers',
      },
    ];
  }

  buildPerformanceMetrics(data: AnalyticsData, fmt: (n: number) => string): PerformanceMetric[] {
    const total = data.orders.total;
    const avgOrderValue = total > 0 ? data.revenue.total / total : 0;
    const returnRate = total > 0 ? (data.orders.cancelled / total) * 100 : 0;
    const avgRating = parseFloat(data.reviews.averageRating);

    return [
      {
        label: 'Conversion Rate',
        value: `${((total / 100) * 100).toFixed(1)}%`,
        valueClass: total > 0 ? 'positive' : 'warning',
      },
      {
        label: 'Average Order Value',
        value: fmt(avgOrderValue),
        valueClass: avgOrderValue > 0 ? 'positive' : 'warning',
      },
      {
        label: 'Return Rate',
        value: `${returnRate.toFixed(1)}%`,
        valueClass: returnRate <= 5 ? 'positive' : 'warning',
      },
      {
        label: 'Customer Satisfaction',
        value: `${avgRating.toFixed(1)}/5.0`,
        valueClass: avgRating >= 4 ? 'positive' : avgRating >= 3 ? 'warning' : 'negative',
      },
    ];
  }

  buildActivities(data: AnalyticsData): { icon: string; iconClass: string; text: string; time: string }[] {
    const activities: { icon: string; iconClass: string; text: string; time: string }[] = [];

    data.orders.recent.slice(0, 2).forEach((order: any) => {
      activities.push({
        icon: '📦',
        iconClass: 'order',
        text: `New order from ${order.customer_name ?? 'Customer'}`,
        time: this.relativeTime(order.created_at),
      });
    });

    data.products.lowStock.slice(0, 2).forEach((product: any) => {
      activities.push({
        icon: '📱',
        iconClass: 'product',
        text: `Low stock alert: ${product.title} (${product.stock} left)`,
        time: 'Recently',
      });
    });

    if (data.reviews.total > 0) {
      activities.push({
        icon: '⭐',
        iconClass: 'review',
        text: `Average rating: ${data.reviews.averageRating}/5 (${data.reviews.total} reviews)`,
        time: 'Overall',
      });
    }

    return activities.length > 0
      ? activities
      : [{ icon: '📌', iconClass: 'order', text: 'No recent activity', time: 'Start selling to see activities' }];
  }

  private relativeTime(dateString: string): string {
    if (!dateString) return 'Recently';
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
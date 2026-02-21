import { Routes } from '@angular/router';
import { SellerDashboardComponent } from './seller-dashboard.component';

export const sellerDashboardRoutes: Routes = [
  {
    path: 'seller-dashboard',
    component: SellerDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./views/dashboard-overview/dashboard-overview.component').then(m => m.DashboardOverviewComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./views/manage-products/manage-products.component').then(m => m.ManageProductsComponent),
      },
      {
        path: 'add-product',
        loadComponent: () =>
          import('./views/add-product/add-product.component').then(m => m.AddProductComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./views/manage-orders/manage-orders.component').then(m => m.ManageOrdersComponent),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./views/order-details/order-details.component').then(m => m.OrderDetailsComponent),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./views/analytics/analytics.component').then(m => m.AnalyticsComponent),
      },
      {
        path: 'promotions',
        loadComponent: () =>
          import('./views/promotions/promotions.component').then(m => m.PromotionsComponent),
      },
    ],
  },
];
// src/app/admin/admin.routes.ts

import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';

export const adminRoutes: Routes = [
  {
    path: 'admin',
    component: AdminComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./views/admin-overview/admin-overview.component').then(m => m.AdminOverviewComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./views/admin-products/admin-products.component').then(m => m.AdminProductsComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./views/admin-orders/admin-orders.component').then(m => m.AdminOrdersComponent),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./views/admin-order-detail/admin-order-detail.component').then(m => m.AdminOrderDetailComponent),
      },
      {
        path: 'agents',
        loadComponent: () =>
          import('./views/admin-agents/admin-agents.component').then(m => m.AdminAgentsComponent),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./views/admin-customers/admin-customers.component').then(m => m.AdminCustomersComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./views/admin-settings/admin-settings.component').then(m => m.AdminSettingsComponent),
      },
    ],
  },
];
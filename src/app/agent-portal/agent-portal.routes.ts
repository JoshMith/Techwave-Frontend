// src/app/agent-portal/agent-portal.routes.ts

import { Routes } from '@angular/router';
import { AgentPortalComponent } from './agent-portal.component';

export const agentPortalRoutes: Routes = [
  // Standalone login — no shell wrapper, no auth guard
  {
    path: 'agent/login',
    loadComponent: () =>
      import('./views/agent-login/agent-login.component').then(
        (m) => m.AgentLoginComponent,
      ),
  },

  // Shell with auth — all /agent/* child views render inside the shell
  {
    path: 'agent',
    component: AgentPortalComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./views/agent-overview/agent-overview.component').then(
            (m) => m.AgentOverviewComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./views/agent-orders/agent-orders.component').then(
            (m) => m.AgentOrdersComponent,
          ),
      },
    ],
  },
];
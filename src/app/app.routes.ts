import { Routes } from '@angular/router';
import { sellerDashboardRoutes } from './seller-dashboard/seller-dashboard.routes';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // ── Spread the seller-dashboard child routes ─────────────────────────────
  ...sellerDashboardRoutes,

  // ── Public pages ─────────────────────────────────────────────────────────
  {
    path: 'home',
    loadComponent: () =>
      import('./homepage/homepage.component').then((m) => m.HomepageComponent),
  },
  {
    path: 'shop',
    loadComponent: () =>
      import('./shop/shop.component').then((m) => m.ShopComponent),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./shared/search-results/search-results.component').then(
        (m) => m.SearchResultsComponent,
      ),
  },
  {
    path: 'deals',
    loadComponent: () =>
      import('./deals/deals.component').then((m) => m.DealsComponent),
  },

  // ── Category pages ────────────────────────────────────────────────────────
  {
    path: 'categories/Phones',
    loadComponent: () =>
      import('./categories/phones/phones.component').then(
        (m) => m.PhonesComponent,
      ),
  },
  {
    path: 'categories/Laptops',
    loadComponent: () =>
      import('./categories/laptops/laptops.component').then(
        (m) => m.LaptopsComponent,
      ),
  },
  {
    path: 'categories/Accessories',
    loadComponent: () =>
      import('./categories/accessories/accessories.component').then(
        (m) => m.AccessoriesComponent,
      ),
  },
  {
    path: 'categories/Home Appliances',
    loadComponent: () =>
      import('./categories/home-appliances/home-appliances.component').then(
        (m) => m.HomeAppliancesComponent,
      ),
  },
  {
    path: 'categories/Gaming',
    loadComponent: () =>
      import('./categories/gaming/gaming.component').then(
        (m) => m.GamingComponent,
      ),
  },
  {
    path: 'categories/Audio & Sound',
    loadComponent: () =>
      import('./categories/audio-sound/audio-sound.component').then(
        (m) => m.AudioSoundComponent,
      ),
  },

  // ── Product ───────────────────────────────────────────────────────────────
  {
    path: 'product/:id',
    loadComponent: () =>
      import('./product/product.component').then((m) => m.ProductComponent),
  },

  // ── Checkout flow ─────────────────────────────────────────────────────────
  {
    path: 'cart',
    loadComponent: () =>
      import('./checkout/cart/cart.component').then((m) => m.CartComponent),
  },
  {
    path: 'checkout/details',
    loadComponent: () =>
      import('./checkout/details/details.component').then(
        (m) => m.DetailsComponent,
      ),
  },
  {
    path: 'checkout/payment',
    loadComponent: () =>
      import('./checkout/payment/payment.component').then(
        (m) => m.PaymentComponent,
      ),
  },
  {
    path: 'checkout/orders',
    loadComponent: () =>
      import('./checkout/orders/orders.component').then(
        (m) => m.OrdersComponent,
      ),
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./auth/signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'forgot-pwd',
    loadComponent: () =>
      import('./auth/forgot-pwd/forgot-pwd.component').then(
        (m) => m.ForgotPwdComponent,
      ),
  },

  // ── User pages ────────────────────────────────────────────────────────────
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/profile.component').then((m) => m.ProfileComponent),
  },

  // ── Legal ─────────────────────────────────────────────────────────────────
  {
    path: 'termsofservice',
    loadComponent: () =>
      import('./legal/termsofservice/termsofservice.component').then(
        (m) => m.TermsofserviceComponent,
      ),
  },
  {
    path: 'privacypolicy',
    loadComponent: () =>
      import('./legal/privacypolicy/privacypolicy.component').then(
        (m) => m.PrivacypolicyComponent,
      ),
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin-dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent,
      ),
  },

  // ── 404 Not Found ─────────────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () =>
      import('./not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },
];

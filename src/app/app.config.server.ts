import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRouting, RenderMode } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRouting([
      { path: '', renderMode: RenderMode.Server },
      { path: 'home', renderMode: RenderMode.Server },
      { path: 'shop', renderMode: RenderMode.Server },
      { path: 'categories/Phones', renderMode: RenderMode.Server },
      { path: 'categories/Laptops', renderMode: RenderMode.Server },
      { path: 'categories/Accessories', renderMode: RenderMode.Server },
      { path: 'categories/Home Appliances', renderMode: RenderMode.Server },
      { path: 'categories/Gaming', renderMode: RenderMode.Server },
      { path: 'categories/Audio & Sound', renderMode: RenderMode.Server },
      { path: 'deals', renderMode: RenderMode.Server },
      { path: 'cart', renderMode: RenderMode.Server },
      { path: 'checkout/details', renderMode: RenderMode.Server },
      { path: 'checkout/payment', renderMode: RenderMode.Server },
      { path: 'checkout/orders', renderMode: RenderMode.Server },
      { path: 'profile', renderMode: RenderMode.Server },
      { path: 'seller-dashboard', renderMode: RenderMode.Server },
      { path: 'product/:id', renderMode: RenderMode.Client },
      { path: 'login', renderMode: RenderMode.Server },
      { path: 'signup', renderMode: RenderMode.Server },
      { path: 'forgot-pwd', renderMode: RenderMode.Server },
      { path: 'termsofservice', renderMode: RenderMode.Server },
      { path: 'privacypolicy', renderMode: RenderMode.Server },
      { path: 'admin', renderMode: RenderMode.Server }
    ])
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

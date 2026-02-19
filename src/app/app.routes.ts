import { Routes } from '@angular/router';

import { HomepageComponent } from './homepage/homepage.component';
import { GamingComponent } from './categories/gaming/gaming.component';
import { HomeAppliancesComponent } from './categories/home-appliances/home-appliances.component';
import { AccessoriesComponent } from './categories/accessories/accessories.component';
import { LaptopsComponent } from './categories/laptops/laptops.component';
import { PhonesComponent } from './categories/phones/phones.component';
import { ShopComponent } from './shop/shop.component';
import { AudioSoundComponent } from './categories/audio-sound/audio-sound.component';
import { DealsComponent } from './deals/deals.component';
import { CartComponent } from './checkout/cart/cart.component';
import { DetailsComponent } from './checkout/details/details.component';
import { PaymentComponent } from './checkout/payment/payment.component';
import { ProfileComponent } from './profile/profile.component';
import { SellerDashboardComponent } from './seller-dashboard/seller-dashboard.component';
import { ProductComponent } from './product/product.component';
import { LoginComponent } from './auth/login/login.component';
import { ForgotPwdComponent } from './auth/forgot-pwd/forgot-pwd.component';
import { SignupComponent } from './auth/signup/signup.component';
import { OrdersComponent } from './checkout/orders/orders.component';
import { TermsofserviceComponent } from './legal/termsofservice/termsofservice.component';
import { PrivacypolicyComponent } from './legal/privacypolicy/privacypolicy.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';


export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', component: HomepageComponent },
    { path: 'shop', component: ShopComponent },
    { path: 'categories/Phones', component: PhonesComponent },
    { path: 'categories/Laptops', component: LaptopsComponent },
    { path: 'categories/Accessories', component: AccessoriesComponent },
    { path: 'categories/Home Appliances', component: HomeAppliancesComponent },
    { path: 'categories/Gaming', component: GamingComponent },
    { path: 'categories/Audio & Sound', component: AudioSoundComponent },
    { path: 'deals', component: DealsComponent },
    
    // Checkout routes with proper structure
    { path: 'cart', component: CartComponent },
    { path: 'checkout/details', component: DetailsComponent },
    { path: 'checkout/payment', component: PaymentComponent },
    { path: 'checkout/orders', component: OrdersComponent },
    
    { path: 'profile', component: ProfileComponent },
    { path: 'seller-dashboard', component: SellerDashboardComponent },
    { path: 'product/:id', component: ProductComponent, providers: [] },
    { path: 'login', component: LoginComponent },
    { path: 'signup', component: SignupComponent },
    { path: 'forgot-pwd', component: ForgotPwdComponent },
    { path: 'termsofservice', component: TermsofserviceComponent },
    { path: 'privacypolicy', component: PrivacypolicyComponent },
    { path: 'admin', component: AdminDashboardComponent }
    
];



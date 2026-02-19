import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map, Subject, switchMap } from 'rxjs';
import { takeUntil, forkJoin, catchError, of } from 'rxjs';
import { ApiService } from '../services/api.service';
import { Router, RouterLink } from '@angular/router';

// Interfaces
interface Order {
  id: string;
  customer: string;
  product: string;
  amount: string;
  status: string;
  date: string;
  statusClass: string;
}

interface Activity {
  icon: string;
  iconClass: string;
  text: string;
  time: string;
}

interface StatCard {
  title: string;
  value: string;
  change: string;
  changeClass: string;
  icon: string;
  iconClass: string;
}

interface QuickAction {
  icon: string;
  text: string;
  action: string;
}

interface PerformanceMetric {
  label: string;
  value: string;
  valueClass?: string;
}

interface Product {
  product_id?: string;
  seller_id?: string;
  category_id: string;
  title: string;
  description: string;
  price: number;
  sale_price?: number;
  stock: number;
  specs?: { key: string; value: string }[] | string;
  status?: string;
}

interface Offer {
  offer_id?: any;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  product_ids?: string[];
  created_at?: string;
}

interface Category {
  category_id?: string;
  name: string;
}

interface SellerProfile {
  seller_id?: string;
  user_id?: string;
  business_name: string;
  tax_id: string;
  business_license: string;
  total_sales?: number;
  created_at?: string;
  name?: string;
  email?: string;
  phone?: string;
}

@Component({
  selector: 'app-seller-dashboard',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './seller-dashboard.component.html',
  styleUrl: './seller-dashboard.component.css',
})
export class SellerDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentSellerId: string | null = null;

  // Navigation state
  currentView = 'dashboard';

  // Mobile menu state
  isMobileMenuOpen = false;

  // User state
  notificationCount = 0;
  userName = 'Seller';
  userRole = '';
  isLoading = true;
  isAuthorized = false;
  error: string | null = null;

  // Dashboard data
  stats: StatCard[] = [
    {
      title: 'Total Revenue',
      value: 'Loading...',
      change: 'Loading...',
      changeClass: 'positive',
      icon: '💰',
      iconClass: 'revenue',
    },
    {
      title: 'Total Orders',
      value: 'Loading...',
      change: 'Loading...',
      changeClass: 'positive',
      icon: '📦',
      iconClass: 'orders',
    },
    {
      title: 'Active Products',
      value: 'Loading...',
      change: 'Loading...',
      changeClass: 'positive',
      icon: '📱',
      iconClass: 'products',
    },
    {
      title: 'Customer Reviews',
      value: 'Loading...',
      change: 'Loading...',
      changeClass: 'positive',
      icon: '⭐',
      iconClass: 'customers',
    },
  ];

  orders: Order[] = [];
  activities: Activity[] = [];

  quickActions: QuickAction[] = [
    {
      icon: '➕',
      text: 'Add Product',
      action: 'add-product',
    },
    {
      icon: '📦',
      text: 'Manage Orders',
      action: 'manage-orders',
    },
    {
      icon: '📊',
      text: 'View Analytics',
      action: 'analytics',
    },
    {
      icon: '🎯',
      text: 'Create Deal',
      action: 'promotions',
    },
  ];

  performanceMetrics: PerformanceMetric[] = [
    {
      label: 'Conversion Rate',
      value: 'Loading...',
    },
    {
      label: 'Average Order Value',
      value: 'Loading...',
    },
    {
      label: 'Return Rate',
      value: 'Loading...',
    },
    {
      label: 'Customer Satisfaction',
      value: 'Loading...',
    },
  ];

  // Products management
  products: any[] = [];
  categories: Category[] = [];
  newProduct: Product = {
    category_id: '',
    title: '',
    description: '',
    price: 0,
    sale_price: undefined,
    stock: 0,
    specs: [],
  };

  // Specifications array for add product form
  specs: { key: string; value: string }[] = [{ key: '', value: '' }];

  // Images array for add product form
  uploadedImages: { file: File; url: string; name: string }[] = [];

  editingProduct: Product | null = null;
  editingProductImages: { file: File; url: string; name: string }[] = [];
  editingProductExistingImages: any[] = [];
  productError: string | null = null;
  productSuccess: string | null = null;

  // Orders management
  allOrders: any[] = [];
  filteredOrders: any[] = [];
  orderFilter = 'all';
  orderSearch = '';

  // Analytics data
  analyticsData: {
    salesTrend: { month: string; sales: number }[];
    topProducts: { name: string; sales: number; revenue: number }[];
    customerStats: {
      totalCustomers?: number;
      newCustomers?: number;
      returningCustomers?: number;
      customerSatisfaction?: number;
    };
    revenueByMonth: { month: string; revenue: number }[];
  } = {
    salesTrend: [],
    topProducts: [],
    customerStats: {},
    revenueByMonth: [],
  };

  // Promotions/Deals
  offers: Offer[] = [];
  newOffer: Offer = {
    title: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    valid_from: '',
    valid_until: '',
    is_active: true,
    product_ids: [],
  };
  editingOffer: Offer | null = null;
  selectedProductsForOffer: string[] = [];
  offerError: string | null = null;
  offerSuccess: string | null = null;
  isSubmittingOffer = false;

  // Profile management
  sellerProfile: SellerProfile | null = null;
  editingProfile = false;
  profileForm: SellerProfile = {
    business_name: '',
    tax_id: '',
    business_license: '',
  };
  profileError: string | null = null;
  profileSuccess: string | null = null;
  profileLoading = false;

  selectedOrder: any = null;
  orderDetails: {
    user?: any;
    address?: any;
    items?: any[];
    payment?: any;
  } = {};
  isLoadingOrderDetails = false;
  isSubmittingProduct = false;
  navigate: any;
  isSeller: boolean = false;

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Mobile Menu Methods
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    if (window.innerWidth > 1024 && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: KeyboardEvent): void {
    if (this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  // Navigation methods
  navigateTo(view: string): void {
    this.currentView = view;
    this.clearMessages();

    switch (view) {
      case 'add-product':
        this.loadCategories();
        this.resetNewProduct();
        this.specs = [{ key: '', value: '' }];
        this.uploadedImages = [];
        break;
      case 'manage-orders':
        this.loadAllOrders();
        break;
      case 'analytics':
        this.loadAnalytics();
        break;
      case 'promotions':
        this.loadOffers();
        break;
      case 'products':
        this.loadProducts();
        break;
      case 'profile':
        this.loadSellerProfile();
        break;
    }
  }

  goToDashboard(): void {
    this.currentView = 'dashboard';
    this.clearMessages();
  }

  private clearMessages(): void {
    this.productError = null;
    this.productSuccess = null;
    this.profileError = null;
    this.profileSuccess = null;
  }

  // Authentication and data loading
  private loadDashboardData(): void {
    this.isLoading = true;
    this.error = null;
    this.isAuthorized = false;

    this.apiService.getCurrentUser().subscribe({
      next: (response) => {
        if (!response || !response.user) {
          this.error = 'User not authenticated';
          this.isLoading = false;
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 5000);
          return;
        }

        const user = response.user;
        const seller = response.seller;

        if (seller) {
          this.isSeller = true;
        }

        this.userName = user.name || 'User';
        this.userRole = user.role || 'buyer';

        // Check authorization
        if (
          this.userRole.toLowerCase() !== 'seller' &&
          this.userRole.toLowerCase() !== 'admin'
        ) {
          this.isAuthorized = false;
          this.isLoading = false;
          return;
        }

        // ✅ Check seller profile and store ID
        if (!seller || !seller.seller_id) {
          console.warn('No seller profile found');
          this.isAuthorized = true;
          this.isLoading = false;
          this.currentView = 'profile';
          return;
        }

        this.isAuthorized = true;
        this.currentSellerId = seller.seller_id.toString();
        console.log('✅ Seller ID:', this.currentSellerId);

        // Load platform-wide data for any seller
        this.loadSellerData();
      },
      error: (err) => {
        console.error('Failed to load user data:', err);
        this.error = 'Failed to load user data. Please log in again.';
        this.isLoading = false;
        setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: this.router.url },
          });
        }, 1000);
      },
    });
  }

  private loadSellerData(): void {
    if (!this.currentSellerId) {
      this.error = 'Seller profile not found';
      this.isLoading = false;
      return;
    }

    // Load platform-wide dashboard stats (not seller-specific)
    this.apiService
      .getSellerDashboardStats(this.currentSellerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Dashboard stats loaded:', response);

          if (response.success && response.data) {
            const data = response.data;

            // Process stats
            this.processNewDashboardStats(data);

            // Process recent orders
            if (data.orders?.recent) {
              this.orders = data.orders.recent
                .slice(0, 5)
                .map((order: any) => ({
                  id: order.order_id || 'N/A',
                  customer: order.customer_name || 'Unknown',
                  product: 'Multiple Items',
                  amount: this.formatCurrency(order.total_amount || 0),
                  status: this.mapOrderStatus(order.status),
                  date: this.formatDate(order.created_at),
                  statusClass: this.getStatusClass(order.status),
                }));
            }

            // Process top products for analytics
            if (data.topProducts) {
              this.analyticsData.topProducts = data.topProducts.map(
                (p: any) => ({
                  name: p.title,
                  sales: p.unitsSold || 0,
                  revenue: p.revenue || 0,
                })
              );
            }

            // Process monthly trend
            if (data.revenue?.monthlyTrend) {
              this.analyticsData.revenueByMonth = data.revenue.monthlyTrend;
            }

            // Process performance metrics
            this.processPerformanceMetrics(data);

            // Generate activities from recent data
            this.generateActivitiesFromData(data);
          }

          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading dashboard stats:', err);
          this.error = 'Failed to load dashboard data. Please try again.';
          this.setDefaultStats();
          this.isLoading = false;
        },
      });
  }

  /**
   * Process dashboard stats from API
   */
  private processNewDashboardStats(statsData: any): void {
    const revenueChange =
      statsData.revenue?.last30Days > 0
        ? `+${(
            (statsData.revenue.last30Days / statsData.revenue.total) *
            100
          ).toFixed(1)}%`
        : '+0%';

    this.stats = [
      {
        title: 'Total Revenue',
        value: this.formatCurrency(statsData.revenue?.total || 0),
        change: `Last 30 days: ${this.formatCurrency(
          statsData.revenue?.last30Days || 0
        )}`,
        changeClass: statsData.revenue?.last30Days > 0 ? 'positive' : 'warning',
        icon: '💰',
        iconClass: 'revenue',
      },
      {
        title: 'Total Orders',
        value: (statsData.orders?.total || 0).toString(),
        change: `${statsData.orders?.pending || 0} pending • ${
          statsData.orders?.processing || 0
        } processing`,
        changeClass: statsData.orders?.total > 0 ? 'positive' : 'warning',
        icon: '📦',
        iconClass: 'orders',
      },
      {
        title: 'Active Products',
        value: (statsData.products?.total || 0).toString(),
        change: `${statsData.products?.inStock || 0} in stock • ${
          statsData.products?.outOfStock || 0
        } out`,
        changeClass: statsData.products?.inStock > 0 ? 'positive' : 'warning',
        icon: '📱',
        iconClass: 'products',
      },
      {
        title: 'Customer Reviews',
        value: `${statsData.reviews?.averageRating || 0}/5`,
        change: `${statsData.reviews?.total || 0} total reviews`,
        changeClass:
          parseFloat(statsData.reviews?.averageRating || '0') >= 4
            ? 'positive'
            : 'warning',
        icon: '⭐',
        iconClass: 'customers',
      },
    ];
  }

  /**
   * Set default stats when API fails
   */
  private setDefaultStats(): void {
    this.stats = this.stats.map((stat) => ({
      ...stat,
      value: '0',
      change: 'No data',
    }));
  }

  /**
   * Process performance metrics from API response
   */
  private processPerformanceMetrics(data: any): void {
    const totalOrders = data.orders?.total || 0;
    const totalRevenue = data.revenue?.total || 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const returnedOrders = data.orders?.cancelled || 0;
    const returnRate =
      totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;

    const avgRating = parseFloat(data.reviews?.averageRating || '0');

    this.performanceMetrics = [
      {
        label: 'Conversion Rate',
        value: `${((totalOrders / 100) * 100).toFixed(1)}%`,
        valueClass: totalOrders > 0 ? 'positive' : 'warning',
      },
      {
        label: 'Average Order Value',
        value: this.formatCurrency(avgOrderValue),
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
        valueClass:
          avgRating >= 4 ? 'positive' : avgRating >= 3 ? 'warning' : 'negative',
      },
    ];
  }

  /**
   * Generate activities from dashboard data
   */
  private generateActivitiesFromData(data: any): void {
    const activities: Activity[] = [];

    if (data.orders?.recent && data.orders.recent.length > 0) {
      data.orders.recent.slice(0, 2).forEach((order: any) => {
        activities.push({
          icon: '📦',
          iconClass: 'order',
          text: `New order from ${order.customer_name || 'Customer'}`,
          time: this.getRelativeTime(order.created_at),
        });
      });
    }

    if (data.products?.lowStock && data.products.lowStock.length > 0) {
      data.products.lowStock.slice(0, 2).forEach((product: any) => {
        activities.push({
          icon: '📱',
          iconClass: 'product',
          text: `Low stock alert: ${product.title} (${product.stock} left)`,
          time: 'Recently',
        });
      });
    }

    if (data.reviews?.total > 0) {
      activities.push({
        icon: '⭐',
        iconClass: 'review',
        text: `Average rating: ${data.reviews.averageRating}/5 (${data.reviews.total} reviews)`,
        time: 'Overall',
      });
    }

    this.activities =
      activities.length > 0
        ? activities
        : [
            {
              icon: '📌',
              iconClass: 'order',
              text: 'No recent activity',
              time: 'Start selling to see activities',
            },
          ];
  }

  // Profile management methods
  private loadSellerProfile(): void {
    this.profileLoading = true;
    this.profileError = null;

    try {
      this.apiService.getCurrentUser().subscribe((user) => {
        if (!user || !user.user) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: '/seller-dashboard' },
          });
          this.profileError = 'User session expired. Please log in again.';
          this.profileLoading = false;
          return;
        }

        const userId = user.user.user_id;

        this.apiService
          .getSellers()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (sellers) => {
              const userSeller = sellers.find((s: any) => s.user_id === userId);

              if (userSeller) {
                this.sellerProfile = userSeller;
                this.profileForm = {
                  business_name: userSeller.business_name || '',
                  tax_id: userSeller.tax_id || '',
                  business_license: userSeller.business_license || '',
                };
              } else {
                this.sellerProfile = null;
              }
              this.profileLoading = false;
            },
            error: (error) => {
              console.error('Error loading seller profile:', error);
              this.router.navigate(['/login'], {
                queryParams: { returnUrl: '/seller-dashboard' },
              });
              this.profileError = 'Failed to load profile. Please try again.';
              this.profileLoading = false;
            },
          });
      });
    } catch (error) {
      console.error('Error parsing user data:', error);
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/seller-dashboard' },
      });
      this.profileError = 'Invalid user session. Please log in again.';
      this.profileLoading = false;
    }
  }

  onEditProfile(): void {
    this.editingProfile = true;
    this.profileError = null;
    this.profileSuccess = null;
  }

  onCancelProfileEdit(): void {
    this.editingProfile = false;
    if (this.sellerProfile) {
      this.profileForm = {
        business_name: this.sellerProfile.business_name || '',
        tax_id: this.sellerProfile.tax_id || '',
        business_license: this.sellerProfile.business_license || '',
      };
    }
    this.profileError = null;
  }

  onSaveProfile(): void {
    if (!this.validateProfile()) {
      return;
    }

    this.profileLoading = true;
    this.profileError = null;
    this.profileSuccess = null;

    if (this.sellerProfile && this.sellerProfile.seller_id) {
      this.apiService
        .updateSeller(this.sellerProfile.seller_id.toString(), this.profileForm)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.profileSuccess = 'Profile updated successfully!';
            this.editingProfile = false;
            this.loadSellerProfile();
          },
          error: (error) => {
            console.error('Error updating profile:', error);
            this.profileError = 'Failed to update profile. Please try again.';
            this.profileLoading = false;
          },
        });
    } else {
      this.apiService
        .createSeller(this.profileForm)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.profileSuccess = 'Profile created successfully!';
            this.editingProfile = false;
            this.loadSellerProfile();
          },
          error: (error) => {
            console.error('Error creating profile:', error);
            this.profileError = 'Failed to create profile. Please try again.';
            this.profileLoading = false;
          },
        });
    }
  }

  private validateProfile(): boolean {
    if (!this.profileForm.business_name.trim()) {
      this.profileError = 'Business name is required';
      return false;
    }
    if (!this.profileForm.tax_id.trim()) {
      this.profileError = 'Tax ID is required';
      return false;
    }
    if (!this.profileForm.business_license.trim()) {
      this.profileError = 'Business license is required';
      return false;
    }
    return true;
  }

  // ✅ MODIFIED: Load ALL products (not filtered by seller)
  private loadProducts(): void {
    console.log('🔍 Loading all products for seller dashboard');

    this.apiService
      .getProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.products = response || [];
          console.log('📦 All products loaded:', this.products.length);
          this.filteredProductsList = [...this.products];
        },
        error: (error) => {
          console.error('❌ Error loading products:', error);
          this.products = [];
          this.filteredProductsList = [];
        },
      });
  }

  productSearch = '';
  productFilterCategory = '';
  productFilterMinPrice: number | null = null;
  productFilterMaxPrice: number | null = null;
  productFilterStatus = '';
  private filteredProductsList: any[] = [];

  get filteredProducts(): any[] {
    return this.filteredProductsList;
  }

  filterProducts(): void {
    const search = (this.productSearch || '').trim().toLowerCase();
    const category = this.productFilterCategory;
    const min =
      this.productFilterMinPrice !== null &&
      this.productFilterMinPrice !== undefined
        ? Number(this.productFilterMinPrice)
        : null;
    const max =
      this.productFilterMaxPrice !== null &&
      this.productFilterMaxPrice !== undefined
        ? Number(this.productFilterMaxPrice)
        : null;
    const status = (this.productFilterStatus || '').toLowerCase();

    let filtered = Array.isArray(this.products) ? [...this.products] : [];

    if (search) {
      filtered = filtered.filter((p: any) => {
        const title = (p.title || p.name || '').toString().toLowerCase();
        const desc = (p.description || p.desc || '').toString().toLowerCase();
        return title.includes(search) || desc.includes(search);
      });
    }

    if (category) {
      filtered = filtered.filter(
        (p: any) =>
          (p.category_id || p.category || '').toString() === category.toString()
      );
    }

    if (min !== null && !Number.isNaN(min)) {
      filtered = filtered.filter(
        (p: any) => Number(p.price || p.sale_price || 0) >= min
      );
    }

    if (max !== null && !Number.isNaN(max)) {
      filtered = filtered.filter(
        (p: any) => Number(p.price || p.sale_price || 0) <= max
      );
    }

    if (status) {
      filtered = filtered.filter((p: any) => {
        const st = (
          p.status ||
          (p.isActive === false ? 'inactive' : 'active') ||
          ''
        )
          .toString()
          .toLowerCase();
        return st === status;
      });
    }

    this.filteredProductsList = filtered;
  }

  clearProductFilters(): void {
    this.productSearch = '';
    this.productFilterCategory = '';
    this.productFilterMinPrice = null;
    this.productFilterMaxPrice = null;
    this.productFilterStatus = '';
    this.filteredProductsList = Array.isArray(this.products)
      ? [...this.products]
      : [];
  }

  private loadCategories(): void {
    this.apiService
      .getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.categories = response || [];
        },
        error: (error) => {
          console.error('Error loading categories:', error);
        },
      });
  }

  // Image handling methods
  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.uploadedImages.push({
              file: file,
              url: e.target.result,
              name: file.name,
            });
          };
          reader.readAsDataURL(file);
        }
      });

      event.target.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.uploadedImages.push({
              file: file,
              url: e.target.result,
              name: file.name,
            });
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  removeImage(index: number): void {
    this.uploadedImages.splice(index, 1);
  }

  addSpecification(): void {
    this.specs.push({ key: '', value: '' });
  }

  removeSpecification(index: number): void {
    if (this.specs.length > 1) {
      this.specs.splice(index, 1);
    }
  }

  /**
   * Add product with images
   */
  onAddProduct(): void {
    if (this.uploadedImages.length === 0) {
      this.productError = 'At least one product image is required';
      return;
    }

    if (!this.validateProduct(this.newProduct)) {
      return;
    }

    try {
      this.apiService.getCurrentUser().subscribe((user) => {
        const sellerString = user.seller;

        if (user) {
          const seller = sellerString;
          console.log('✅ Creating product for seller ID:', seller?.seller_id);

          const specsObject: { [key: string]: any } = {};
          this.specs.forEach((spec) => {
            if (spec.key && spec.value) {
              specsObject[spec.key] = spec.value;
            }
          });

          const productData = {
            seller_id: seller?.seller_id,
            category_id: this.newProduct.category_id,
            title: this.newProduct.title,
            description: this.newProduct.description,
            price: this.newProduct.price,
            sale_price: this.newProduct.sale_price || null,
            stock: this.newProduct.stock || 0,
            specs: JSON.stringify(specsObject),
          };

          console.log('Creating product with data:', productData);

          this.apiService
            .createProduct(productData)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                const productId = response.productId;
                console.log('Product created:', productId);

                this.uploadImages(productId);
              },
              error: (error) => {
                console.error('Error creating product:', error);
                this.productError =
                  'Failed to create product. Please try again.';
              },
            });
        } else {
          this.productError = 'User session expired. Please log in again.';
        }
      });
    } catch (error) {
      console.error('Error parsing user data:', error);
      this.productError = 'Invalid user session. Please log in again.';
    }
  }

  /**
   * Upload images for a product
   */
  private uploadImages(productId: number): void {
    const formData = new FormData();

    this.uploadedImages.forEach((image, index) => {
      formData.append('images', image.file);
    });

    formData.append('setPrimary', 'true');
    formData.append('altText', this.newProduct.title);

    console.log('Uploading images for product:', productId);

    this.apiService
      .uploadProductImages(productId.toString(), formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Images uploaded successfully:', response);
          this.productSuccess = 'Product and images added successfully!';
          this.resetNewProduct();
          this.uploadedImages = [];
          this.specs = [{ key: '', value: '' }];
          this.loadSellerData();

          setTimeout(() => {
            this.productSuccess = null;
          }, 5000);
        },
        error: (error) => {
          console.error('Error uploading images:', error);
          this.productError =
            'Product created but failed to upload images. Please try adding images later.';
        },
      });
  }

  /**
   * Validate product data
   */
  private validateProduct(product: Product): boolean {
    if (!product.title.trim()) {
      this.productError = 'Product title is required';
      return false;
    }
    if (product.title.length > 200) {
      this.productError = 'Product title must be 200 characters or less';
      return false;
    }
    if (!product.description.trim()) {
      this.productError = 'Product description is required';
      return false;
    }
    if (product.price <= 0) {
      this.productError = 'Product price must be greater than 0';
      return false;
    }
    if (!product.category_id) {
      this.productError = 'Please select a category';
      return false;
    }
    if (product.stock < 0) {
      this.productError = 'Stock cannot be negative';
      return false;
    }
    if (product.sale_price && product.sale_price >= product.price) {
      this.productError = 'Sale price must be less than regular price';
      return false;
    }

    return true;
  }

  /**
   * Reset product form
   */
  private resetNewProduct(): void {
    this.newProduct = {
      category_id: '',
      title: '',
      description: '',
      price: 0,
      sale_price: undefined,
      stock: 0,
      specs: [],
    };
    this.isSubmittingProduct = false;
  }

  onEditProduct(product: any): void {
    this.editingProduct = { ...product };
    this.editingProductImages = [];
    this.editingProductExistingImages = [];

    // Load existing product images
    if (product.product_id) {
      this.apiService
        .serveProductImagesSafe(product.product_id.toString())
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (images) => {
            this.editingProductExistingImages = images || [];
            console.log(
              '✅ Loaded existing images:',
              this.editingProductExistingImages
            );

            // Debug: Log the structure of the first image
            if (this.editingProductExistingImages.length > 0) {
              const firstImage = this.editingProductExistingImages[0];
              console.log('📸 First image FULL object:', firstImage);
              console.log('📸 ALL properties:', Object.keys(firstImage));
              console.log(
                '📸 Image as JSON:',
                JSON.stringify(firstImage, null, 2)
              );
            }
          },
          error: (error) => {
            console.warn('⚠️ No existing images found:', error);
            this.editingProductExistingImages = [];
          },
        });
    }
  }

  onEditProductFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.editingProductImages.push({
              file: file,
              url: e.target.result,
              name: file.name,
            });
          };
          reader.readAsDataURL(file);
        }
      });
      event.target.value = '';
    }
  }

  removeEditingProductImage(index: number): void {
    this.editingProductImages.splice(index, 1);
  }

  removeExistingProductImage(image: any): void {
    // Check which ID property exists - try all possible variations
    const imageId =
      image.image_id ||
      image.id ||
      image.productImageId ||
      image.product_image_id ||
      image.imageId;

    if (!imageId) {
      console.error('❌ Image ID not found. Image object:', image);
      console.error('Available properties:', Object.keys(image));
      this.productError = 'Cannot delete image: ID not found';
      setTimeout(() => (this.productError = null), 3000);
      return;
    }

    if (confirm('Are you sure you want to delete this image?')) {
      console.log('🗑️ Deleting image with ID:', imageId);
      console.log('Full image object:', image);

      this.apiService
        .deleteProductImage(imageId.toString())
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Remove the image from the array using the same ID check
            this.editingProductExistingImages =
              this.editingProductExistingImages.filter((img) => {
                const imgId =
                  img.image_id ||
                  img.id ||
                  img.productImageId ||
                  img.product_image_id ||
                  img.imageId;
                return imgId !== imageId;
              });
            this.productSuccess = 'Image deleted successfully!';
            console.log('✅ Image deleted successfully');
            setTimeout(() => (this.productSuccess = null), 3000);
          },
          error: (error) => {
            console.error('❌ Error deleting image:', error);
            this.productError = `Failed to delete image: ${
              error.error?.message || error.message
            }`;
            setTimeout(() => (this.productError = null), 5000);
          },
        });
    }
  }

  onUpdateProduct(): void {
    if (this.editingProduct) {
      this.apiService
        .updateProduct(this.editingProduct.product_id!, this.editingProduct)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            // If there are new images to upload
            if (this.editingProductImages.length > 0) {
              this.uploadEditingProductImages(this.editingProduct!.product_id!);
            } else {
              this.productSuccess = 'Product updated successfully!';
              this.editingProduct = null;
              this.editingProductImages = [];
              this.editingProductExistingImages = [];
              this.loadProducts();
              setTimeout(() => (this.productSuccess = null), 3000);
            }
          },
          error: (error) => {
            console.error('Error updating product:', error);
            this.productError = 'Failed to update product. Please try again.';
            setTimeout(() => (this.productError = null), 3000);
          },
        });
    }
  }

  private uploadEditingProductImages(productId: string): void {
    const formData = new FormData();

    this.editingProductImages.forEach((image) => {
      formData.append('images', image.file);
    });

    formData.append('altText', this.editingProduct?.title || 'Product image');

    console.log('Uploading new images for product:', productId);

    this.apiService
      .uploadProductImages(productId.toString(), formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('New images uploaded successfully:', response);
          this.productSuccess = 'Product and images updated successfully!';
          this.editingProduct = null;
          this.editingProductImages = [];
          this.editingProductExistingImages = [];
          this.loadProducts();
          setTimeout(() => (this.productSuccess = null), 3000);
        },
        error: (error) => {
          console.error('Error uploading new images:', error);
          this.productError =
            'Product updated but failed to upload new images.';
          this.editingProduct = null;
          this.editingProductImages = [];
          this.editingProductExistingImages = [];
          this.loadProducts();
          setTimeout(() => (this.productError = null), 3000);
        },
      });
  }

  onDeleteProduct(productId: string): void {
    if (confirm('Are you sure you want to delete this product?')) {
      this.apiService
        .deleteProduct(productId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.productSuccess = 'Product deleted successfully!';
            this.loadProducts();
            this.loadSellerData();
          },
          error: (error) => {
            console.error('Error deleting product:', error);
            this.productError = 'Failed to delete product. Please try again.';
          },
        });
    }
  }

  // ✅ MODIFIED: Load ALL orders (not filtered by seller)
  private loadAllOrders(): void {
    console.log('🔍 Loading all orders for seller dashboard');

    this.apiService
      .getOrders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orders: any[]) => {
          this.allOrders = orders || [];
          this.filteredOrders = [...this.allOrders];
          console.log('📊 All orders loaded:', this.allOrders.length);
        },
        error: (error) => {
          console.error('❌ Error loading orders:', error);
          this.allOrders = [];
          this.filteredOrders = [];
        },
      });
  }

  filterOrders(): void {
    let filtered = this.allOrders;

    if (this.orderFilter !== 'all') {
      filtered = filtered.filter(
        (order) =>
          order.status &&
          order.status.toLowerCase() === this.orderFilter.toLowerCase()
      );
    }

    if (this.orderSearch.trim()) {
      const searchTerm = this.orderSearch.toLowerCase();
      filtered = filtered.filter((order) => {
        const id = (order.order_id || order._id || '').toString().toLowerCase();
        const customerName = (
          order.user_name ||
          order.customer?.name ||
          ''
        ).toLowerCase();
        const productName = (
          order.product_name ||
          order.items?.[0]?.productName ||
          ''
        ).toLowerCase();
        return (
          id.includes(searchTerm) ||
          customerName.includes(searchTerm) ||
          productName.includes(searchTerm)
        );
      });
    }

    this.filteredOrders = filtered;
  }

  updateOrderStatus(orderId: string, newStatus: string): void {
    this.apiService
      .updateOrder(orderId, { status: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadAllOrders();
          this.loadSellerData();
        },
        error: (error) => {
          console.error('Error updating order status:', error);
        },
      });
  }

  // Analytics methods
  private loadAnalytics(): void {
    if (!this.currentSellerId) {
      console.warn('No seller ID for analytics');
      return;
    }

    this.apiService
      .getSellerDashboardStats(this.currentSellerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const data = response.data;

            this.analyticsData = {
              salesTrend: data.revenue?.monthlyTrend || [],
              topProducts: (data.topProducts || []).map((p: any) => ({
                name: p.title,
                sales: p.unitsSold || 0,
                revenue: p.revenue || 0,
              })),
              revenueByMonth: data.revenue?.monthlyTrend || [],
              customerStats: {
                totalCustomers: data.orders?.total || 0,
                newCustomers: 0,
                returningCustomers: 0,
                customerSatisfaction: parseFloat(
                  data.reviews?.averageRating || '0'
                ),
              },
            };
          }
        },
        error: (err) => {
          console.error('Error loading analytics:', err);
        },
      });
  }

  // Offers/Promotions methods
  private loadOffers(): void {
    this.apiService
      .getSpecialOffers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const allOffers = response.data || response || [];
          // Filter offers by seller if needed (depends on your API structure)
          this.offers = Array.isArray(allOffers) ? allOffers : [];
        },
        error: (error) => {
          console.error('Error loading offers:', error);
          this.offers = [];
        },
      });
  }

  toggleProductSelection(productId: string): void {
    const index = this.selectedProductsForOffer.indexOf(productId);
    if (index > -1) {
      this.selectedProductsForOffer.splice(index, 1);
    } else {
      this.selectedProductsForOffer.push(productId);
    }
  }

  isProductSelected(productId: string): boolean {
    return this.selectedProductsForOffer.includes(productId);
  }

  onCreateOffer(): void {
    if (!this.validateOffer()) {
      return;
    }

    this.isSubmittingOffer = true;
    this.clearMessages();

    const offerData = {
      ...this.newOffer,
      product_ids: this.selectedProductsForOffer,
    };

    this.apiService
      .createSpecialOffer(offerData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.offerSuccess = 'Offer created successfully!';
          this.isSubmittingOffer = false;
          this.resetNewOffer();
          this.selectedProductsForOffer = [];
          this.loadOffers();

          setTimeout(() => {
            this.clearMessages();
          }, 3000);
        },
        error: (error) => {
          console.error('Error creating offer:', error);
          this.offerError =
            error.error?.message || 'Failed to create offer. Please try again.';
          this.isSubmittingOffer = false;
        },
      });
  }

  editOffer(offer: any): void {
    this.editingOffer = { ...offer };
    this.selectedProductsForOffer = offer.product_ids || [];
    this.navigateTo('edit-offer');
  }

  onUpdateOffer(): void {
    if (!this.editingOffer || !this.editingOffer.offer_id) {
      this.offerError = 'Offer ID not found';
      return;
    }

    if (!this.validateOffer(this.editingOffer)) {
      return;
    }

    this.isSubmittingOffer = true;
    this.clearMessages();

    const offerData = {
      ...this.editingOffer,
      product_ids: this.selectedProductsForOffer,
    };

    this.apiService
      .updateSpecialOffer(this.editingOffer.offer_id, offerData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.offerSuccess = 'Offer updated successfully!';
          this.isSubmittingOffer = false;
          this.editingOffer = null;
          this.selectedProductsForOffer = [];
          this.loadOffers();

          setTimeout(() => {
            this.navigateTo('promotions');
            this.clearMessages();
          }, 2000);
        },
        error: (error) => {
          console.error('Error updating offer:', error);
          this.offerError = 'Failed to update offer. Please try again.';
          this.isSubmittingOffer = false;
        },
      });
  }

  cancelOfferEdit(): void {
    this.editingOffer = null;
    this.selectedProductsForOffer = [];
    this.navigateTo('promotions');
  }

  private validateOffer(offer: Offer = this.newOffer): boolean {
    if (!offer.title || !offer.description) {
      this.offerError = 'Please fill in title and description';
      return false;
    }

    if (offer.discount_value <= 0) {
      this.offerError = 'Discount value must be greater than 0';
      return false;
    }

    if (offer.discount_type === 'percentage' && offer.discount_value > 100) {
      this.offerError = 'Percentage discount cannot exceed 100%';
      return false;
    }

    if (!offer.valid_from || !offer.valid_until) {
      this.offerError = 'Please set valid date range';
      return false;
    }

    const fromDate = new Date(offer.valid_from);
    const toDate = new Date(offer.valid_until);

    if (fromDate >= toDate) {
      this.offerError = 'End date must be after start date';
      return false;
    }

    return true;
  }

  // Add this temporarily to debug
  toggleOfferStatus(offer: any): void {
    console.log('Full offer object:', offer);
    console.log('Offer ID:', offer.offer_id);
    console.log('All keys:', Object.keys(offer));

    if (!offer.offer_id) {
      console.error('Offer ID is missing!');
      this.offerError = 'Invalid offer - missing ID';
      return;
    }

    const newStatus = !offer.is_active;

    this.apiService
      .toggleSpecialOfferActivation(offer.offer_id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          offer.is_active = response.is_active;
          this.offerSuccess = `Offer ${
            newStatus ? 'activated' : 'deactivated'
          } successfully`;
          setTimeout(() => this.clearMessages(), 3000);
        },
        error: (error) => {
          console.error('Error toggling offer status:', error);
          this.offerError = 'Failed to toggle offer status';
          setTimeout(() => this.clearMessages(), 3000);
        },
      });
  }

  deleteOffer(offerId: string): void {
    if (confirm('Are you sure you want to delete this offer?')) {
      this.apiService
        .deleteSpecialOffer(offerId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.offerSuccess = 'Offer deleted successfully!';
            this.loadOffers();
            setTimeout(() => this.clearMessages(), 3000);
          },
          error: (error) => {
            console.error('Error deleting offer:', error);
            this.offerError = 'Failed to delete offer. Please try again.';
            setTimeout(() => this.clearMessages(), 3000);
          },
        });
    }
  }

  private resetNewOffer(): void {
    this.newOffer = {
      title: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      valid_from: '',
      valid_until: '',
      is_active: true,
      product_ids: [],
    };
  }

  // Utility methods
  public mapOrderStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'Pending',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      returned: 'Returned',
    };
    return statusMap[status?.toLowerCase()] || status || 'Unknown';
  }

  public getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      pending: 'pending',
      processing: 'processing',
      shipped: 'processing',
      delivered: 'delivered',
      cancelled: 'cancelled',
      returned: 'cancelled',
    };
    return statusClasses[status?.toLowerCase()] || 'pending';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    })
      .format(amount)
      .replace('KES', 'KSh');
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private getRelativeTime(dateString: string): string {
    if (!dateString) return 'Recently';

    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return this.formatDate(dateString);
  }

  // Event handlers
  onQuickActionClick(action: string): void {
    this.navigateTo(action);
  }

  onOrderClick(orderId: string): void {
    this.selectedOrder = null;
    this.isLoadingOrderDetails = true;
    this.orderDetails = {};

    this.apiService
      .getOrderById(orderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          this.selectedOrder = order;

          const userId = order.user_id;
          const addressId = order.address_id;

          forkJoin({
            user: userId
              ? this.apiService
                  .getUserById(userId)
                  .pipe(catchError(() => of(null)))
              : of(null),
            address: addressId
              ? this.apiService
                  .getAddressById(addressId)
                  .pipe(catchError(() => of(null)))
              : of(null),
            orderItems: this.apiService
              .getOrderItems()
              .pipe(catchError(() => of({ data: [] }))),
            payment: this.apiService
              .getPayments()
              .pipe(catchError(() => of({ data: [] }))),
          }).subscribe({
            next: (data) => {
              this.orderDetails.user = data.user;
              this.orderDetails.address = data.address;

              const allItems = data.orderItems.data || data.orderItems || [];
              this.orderDetails.items = allItems.filter(
                (item: any) =>
                  item.order_id === orderId || item.order_id === order.order_id
              );

              const allPayments = data.payment.data || data.payment || [];
              this.orderDetails.payment = allPayments.find(
                (payment: any) =>
                  payment.order_id === orderId ||
                  payment.order_id === order.order_id
              );

              this.isLoadingOrderDetails = false;
              this.navigateTo('order-details');
            },
            error: (error) => {
              console.error('Error loading order details:', error);
              this.isLoadingOrderDetails = false;
            },
          });
        },
        error: (error) => {
          console.error('Error loading order:', error);
          alert(
            `Error Loading Order: ${error.error.message || 'Unknown error'}`
          );
          this.isLoadingOrderDetails = false;
        },
      });
  }

  closeOrderDetails(): void {
    this.selectedOrder = null;
    this.orderDetails = {};
    this.navigateTo('manage-orders');
  }

  onNotificationClick(): void {
    console.log('Notifications clicked');
  }

  onProfileClick(): void {
    this.router.navigate(['/profile']);
  }

  refreshData(): void {
    this.loadDashboardData();
  }
}

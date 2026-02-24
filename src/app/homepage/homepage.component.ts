import { CommonModule } from '@angular/common';
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { CartService } from '../services/cart.service';
import { finalize } from 'rxjs/operators';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { PAGE_SEO, SeoService } from '../services/seo.service';

interface Category {
  category_id: number;
  name: string;
  description: string;
  featured: boolean;
  icon_path: string;
  created_at: string;
  // For display purposes
  icon?: string;
  count?: number;
  key?: string;
}

@Component({
  selector: 'app-homepage',
  imports: [CommonModule, HeaderComponent, FooterComponent],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.css',
})
export class HomepageComponent implements OnInit {
  isBrowser: boolean;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private seoService: SeoService,
    @Inject(PLATFORM_ID) private platformId: any,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  featuredCategories: Category[] = [];
  isLoading = true;
  error: string | null = null;
  isAdmin = false;

  heroImages: string[] = [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1511385348-a52b4a160dc2?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1468436139062-f60a71c5c892?w=500&h=500&fit=crop',
  ];

  currentHeroImage: string = '';
  private heroImageInterval: any;

  ngOnInit(): void {
    // Set page-specific SEO meta tags
    this.seoService.setPage(PAGE_SEO['home']);
    
    this.loadCategories();
    if (this.isBrowser) {
      this.startHeroImageRotation();
    }
    this.checkIfAdmin();
  }

  ngOnDestroy(): void {
    if (this.heroImageInterval) {
      clearInterval(this.heroImageInterval);
    }
  }

  checkIfAdmin(): void {
    if (this.isBrowser) {
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        try {
          const user = JSON.parse(currentUser);
          this.isAdmin = user.role === 'admin' || user.is_admin === true;
        } catch (e) {
          console.error('Failed to parse currentUser from localStorage:', e);
          this.isAdmin = false;
        }
      }
    }
  }

  /**
   * Load categories from API
   */
  loadCategories(): void {
    this.isLoading = true;
    this.error = null;

    this.apiService.getCategories().subscribe({
      next: (categories: Category[]) => {
        this.featuredCategories = categories.map((category) => ({
          ...category,
          icon: this.getCategoryIcon(category.name),
          key: this.createCategoryKey(category.name),
          count: 0, // Initialize with 0, will be updated
        }));

        // Fetch product counts for each category
        this.loadProductCounts();
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.error = 'Failed to load categories. Please try again later.';
        this.isLoading = false;
        this.featuredCategories = this.getDefaultCategories();
      },
    });
  }

  /**
   * Load product counts for all categories
   */
  private loadProductCounts(): void {
    const countRequests = this.featuredCategories.map((category) =>
      this.apiService
        .getProductCountByCategory(category.category_id.toString())
        .pipe(
          finalize(() => {
            // When all requests complete, set loading to false
            if (this.featuredCategories.every((c) => c.count !== undefined)) {
              this.isLoading = false;
            }
          }),
        ),
    );

    countRequests.forEach((request, index) => {
      request.subscribe({
        next: (response) => {
          this.featuredCategories[index].count = response.data.product_count;
        },
        error: (err) => {
          console.error(
            `Failed to load product count for category ${this.featuredCategories[index].name}:`,
            err,
          );
          // Fallback to random count if API fails
          this.featuredCategories[index].count = this.getRandomProductCount();
        },
      });
    });
  }

  /**
   * Handle category card clicks
   */
  selectCategory(category: any): void {
    this.router.navigate(['/categories', category.name]);
  }

  /**
   * Create a URL-friendly key from category name
   */
  private createCategoryKey(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  /**
   * Get an emoji icon based on category name
   */
  private getCategoryIcon(name: string): string {
    const iconMap: { [key: string]: string } = {
      Phones: '📱',
      Laptops: '💻',
      Accessories: '🎧',
      'Home Appliances': '🏠',
      Gaming: '🎮',
      'Audio & Sound': '🔊',
      Computers: '🖥️',
      Tablets: '📱',
      Cameras: '📷',
    };

    return iconMap[name] || '🛍️';
  }

  /**
   * Generate random product count (fallback when API fails)
   */
  private getRandomProductCount(): number {
    return Math.floor(Math.random() * 50) + 10;
  }

  /**
   * Default categories in case API fails
   */
  private getDefaultCategories(): Category[] {
    return [
      {
        name: 'Phones',
        icon: '📱',
        count: 24,
        key: 'Phones',
        category_id: 1,
        description: '',
        featured: true,
        icon_path: '',
        created_at: '',
      },
      {
        name: 'Laptops',
        icon: '💻',
        count: 17,
        key: 'Laptops',
        category_id: 2,
        description: '',
        featured: true,
        icon_path: '',
        created_at: '',
      },
      {
        name: 'Accessories',
        icon: '🎧',
        count: 42,
        key: 'Accessories',
        category_id: 3,
        description: '',
        featured: true,
        icon_path: '',
        created_at: '',
      },
      {
        name: 'Home Appliances',
        icon: '🏠',
        count: 15,
        key: 'Home Appliances',
        category_id: 4,
        description: '',
        featured: true,
        icon_path: '',
        created_at: '',
      },
      {
        name: 'Gaming',
        icon: '🎮',
        count: 32,
        key: 'Gaming',
        category_id: 5,
        description: '',
        featured: true,
        icon_path: '',
        created_at: '',
      },
      {
        name: 'Audio & Sound',
        icon: '🔊',
        count: 13,
        key: 'Audio & Sound',
        category_id: 6,
        description: '',
        featured: true,
        icon_path: '',
        created_at: '',
      },
    ];
  }

  /**
   * Handle category click
   */
  onCategoryClick(category: string): void {
    this.router.navigate([`/categories/${category.toLowerCase()}`]);
  }

  /**
   * Handle Shop Now button click
   */
  onShopNow(): void {
    this.router.navigate(['/shop']);
  }

  sellerPortal(): void {
    this.router.navigate(['/seller-dashboard']);
  }

  adminPortal(): void {
    if (!this.isAdmin) {
      alert('Access denied. Only admins can access the admin portal.');
    } else {
      this.router.navigate(['/admin']);
    }
  }

  /**
   * Start rotating hero images
   */
  startHeroImageRotation(): void {
    // Set initial image
    this.currentHeroImage = this.getRandomHeroImage();

    // Change image every 5 seconds
    this.heroImageInterval = setInterval(() => {
      this.currentHeroImage = this.getRandomHeroImage();
    }, 5000);
  }

  /**
   * Get random hero image from the array
   */
  getRandomHeroImage(): string {
    const randomIndex = Math.floor(Math.random() * this.heroImages.length);
    return this.heroImages[randomIndex];
  }

  /**
   * Manually change to next hero image
   */
  nextHeroImage(): void {
    const currentIndex = this.heroImages.indexOf(this.currentHeroImage);
    const nextIndex = (currentIndex + 1) % this.heroImages.length;
    this.currentHeroImage = this.heroImages[nextIndex];

    // Reset the interval
    if (this.heroImageInterval) {
      clearInterval(this.heroImageInterval);
      this.heroImageInterval = setInterval(() => {
        this.currentHeroImage = this.getRandomHeroImage();
      }, 5000);
    }
  }

  /**
   * Manually change to previous hero image
   */
  previousHeroImage(): void {
    const currentIndex = this.heroImages.indexOf(this.currentHeroImage);
    const prevIndex =
      (currentIndex - 1 + this.heroImages.length) % this.heroImages.length;
    this.currentHeroImage = this.heroImages[prevIndex];

    // Reset the interval
    if (this.heroImageInterval) {
      clearInterval(this.heroImageInterval);
      this.heroImageInterval = setInterval(() => {
        this.currentHeroImage = this.getRandomHeroImage();
      }, 5000);
    }
  }

  /**
   * Set specific hero image
   */
  setHeroImage(imageUrl: string): void {
    this.currentHeroImage = imageUrl;

    // Reset the interval
    if (this.heroImageInterval) {
      clearInterval(this.heroImageInterval);
      this.heroImageInterval = setInterval(() => {
        this.currentHeroImage = this.getRandomHeroImage();
      }, 5000);
    }
  }

  /**
   * Handle image load
   */
  onImageLoad(): void {
    console.log('Hero image loaded successfully');
  }

  /**
   * Handle image error
   */
  onImageError(): void {
    console.error('Failed to load hero image:', this.currentHeroImage);
    // Fallback to a default image or skip to next
    this.nextHeroImage();
  }
}

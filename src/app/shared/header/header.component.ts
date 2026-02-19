// ============================================
// header.component.ts (With search)
// ============================================

import { Component, HostListener, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { SearchService } from '../../services/search.service';


interface GuestUser {
  session_id: string;
  created_at: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  constructor(
    private router: Router,
    private apiService: ApiService,
    private cartService: CartService,
    private searchService: SearchService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Cart
  cartCount = 0;
  currentUser: any = null;
  guestUser: GuestUser | null = null;
  isBrowser: boolean;
  private cartSubscription?: Subscription;

  // Mobile menu
  isMobileMenuOpen: boolean = false;
  isMobileCategoriesOpen: boolean = false;

  // Search
  searchQuery = '';
  suggestions: any = { products: [], categories: [] };
  showSuggestions = false;
  isSearching = false;
  private searchInput$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    if (this.isBrowser) {
      this.loadGuestUser();
      this.subscribeToCartState();
      this.setupSearchAutocomplete();
    }
  }

  ngOnDestroy(): void {
    this.cartSubscription?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToCartState(): void {
    this.cartSubscription = this.cartService.cartState$.subscribe(state => {
      this.cartCount = state.item_count;
    });
    this.cartService.initializeCart();
  }

  private loadGuestUser(): void {
    if (!this.isBrowser) return;
    try {
      const guestStr = localStorage.getItem('guestUser');
      if (guestStr) {
        this.guestUser = JSON.parse(guestStr);
      } else if (!this.currentUser) {
        this.guestUser = this.createGuestUser();
        localStorage.setItem('guestUser', JSON.stringify(this.guestUser));
      }
    } catch (error) {
      console.warn('Failed to load/create guest user:', error);
    }
  }

  private createGuestUser(): GuestUser {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 11);
    return {
      session_id: `session_${timestamp}_${randomStr}`,
      created_at: new Date().toISOString()
    };
  }

  // ─── Search methods ───────────────────────────────

  private setupSearchAutocomplete(): void {
    this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.trim().length < 2) {
          this.suggestions = { products: [], categories: [] };
          this.showSuggestions = false;
          return [];
        }
        this.isSearching = true;
        return this.searchService.getSuggestions(query);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result: any) => {
        this.isSearching = false;
        if (result) {
          this.suggestions = result;
          this.showSuggestions = (result.products?.length > 0 || result.categories?.length > 0);
        }
      },
      error: () => {
        this.isSearching = false;
        this.suggestions = { products: [], categories: [] };
      }
    });
  }

  onSearchInput(): void {
    this.searchInput$.next(this.searchQuery);
    if (!this.searchQuery.trim()) {
      this.showSuggestions = false;
    }
  }

  onSearchSubmit(): void {
    if (!this.searchQuery.trim()) return;
    this.showSuggestions = false;
    this.router.navigate(['/search'], { queryParams: { q: this.searchQuery.trim() } });
    if (this.isMobileMenuOpen) this.closeMobileMenu();
  }

  selectSuggestion(title: string): void {
    this.searchQuery = title;
    this.showSuggestions = false;
    this.router.navigate(['/search'], { queryParams: { q: title } });
  }

  selectCategorySuggestion(categoryName: string): void {
    this.showSuggestions = false;
    this.searchQuery = '';
    this.router.navigate(['/categories', categoryName]);
  }

  hideSuggestions(): void {
    // Small delay so clicks on suggestions register
    setTimeout(() => { this.showSuggestions = false; }, 150);
  }

  // ─── Mobile menu ─────────────────────────────────

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (!this.isMobileMenuOpen) {
      this.isMobileCategoriesOpen = false;
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.isMobileCategoriesOpen = false;
  }

  toggleMobileCategories(): void {
    this.isMobileCategoriesOpen = !this.isMobileCategoriesOpen;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    if (event.target.innerWidth > 1024 && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: KeyboardEvent): void {
    if (this.isMobileMenuOpen) this.closeMobileMenu();
    if (this.showSuggestions) this.showSuggestions = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-container')) {
      this.showSuggestions = false;
    }
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }
}
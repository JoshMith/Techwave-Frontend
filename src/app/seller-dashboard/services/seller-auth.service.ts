import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

export interface SellerUser {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  created_at?: string;
}

export interface SellerProfile {
  seller_id?: string;
  user_id?: number;
  business_name: string;
  tax_id: string;
  business_license: string;
  total_sales?: number;
  created_at?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface AuthState {
  user: SellerUser | null;
  seller: SellerProfile | null;
  isAuthorized: boolean;
  isSeller: boolean;
  isLoading: boolean;
  error: string | null;
}

const INITIAL_STATE: AuthState = {
  user: null,
  seller: null,
  isAuthorized: false,
  isSeller: false,
  isLoading: true,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class SellerAuthService {
  private state$ = new BehaviorSubject<AuthState>(INITIAL_STATE);
  readonly authState$ = this.state$.asObservable();

  get snapshot(): AuthState {
    return this.state$.getValue();
  }
  get sellerId(): string | null {
    return this.snapshot.seller?.seller_id?.toString() ?? null;
  }
  get userName(): string {
    return this.snapshot.user?.name ?? 'Seller';
  }
  get userRole(): string {
    return this.snapshot.user?.role ?? '';
  }

  constructor(private api: ApiService, private router: Router) {}

  /**
   * Replaces loadDashboardData() — called once from the shell on init.
   * Returns final AuthState so the shell can decide whether to redirect.
   */
  initialize(): Observable<AuthState> {
    this.patch({ isLoading: true, error: null });

    return this.api.getCurrentUser().pipe(
      map((response) => {
        if (!response?.user) {
          const next = { ...INITIAL_STATE, isLoading: false, error: 'Not authenticated' };
          this.state$.next(next);
          return next;
        }

        const user: SellerUser = response.user;
        const seller: SellerProfile | null = response.seller ?? null;
        const role = (user.role ?? '').toLowerCase();
        const isAuthorized = role === 'seller' || role === 'admin';
        const isSeller = !!seller;

        const next: AuthState = {
          user,
          seller,
          isAuthorized,
          isSeller,
          isLoading: false,
          error: null,
        };
        this.state$.next(next);
        return next;
      }),
      catchError(() => {
        const next = { ...INITIAL_STATE, isLoading: false, error: 'Failed to load user data. Please log in again.' };
        this.state$.next(next);
        return of(next);
      })
    );
  }

  /** Reload seller profile from /sellers endpoint (used by profile view) */
  loadSellerProfile(): Observable<SellerProfile | null> {
    const userId = this.snapshot.user?.user_id;
    if (!userId) return of(null);

    return this.api.getSellers().pipe(
      map((sellers: any[]) => {
        const found = sellers.find((s: any) => s.user_id === userId) ?? null;
        this.patch({ seller: found });
        return found;
      }),
      catchError(() => of(null))
    );
  }

  createProfile(data: Partial<SellerProfile>): Observable<SellerProfile> {
    return this.api.createSeller(data).pipe(
      map((res) => {
        const seller = res.seller ?? res;
        this.patch({ seller });
        return seller;
      })
    );
  }

  updateProfile(sellerId: string, data: Partial<SellerProfile>): Observable<SellerProfile> {
    return this.api.updateSeller(sellerId, data).pipe(
      map((res) => {
        const seller = res.seller ?? res;
        this.patch({ seller });
        return seller;
      })
    );
  }

  redirectToLogin(returnUrl?: string): void {
    this.state$.next(INITIAL_STATE);
    this.router.navigate(['/login'], {
      queryParams: returnUrl ? { returnUrl } : {},
    });
  }

  private patch(partial: Partial<AuthState>): void {
    this.state$.next({ ...this.state$.getValue(), ...partial });
  }
}
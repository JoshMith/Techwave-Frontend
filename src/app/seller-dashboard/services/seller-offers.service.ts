import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

export interface Offer {
  offer_id?: string;
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

@Injectable({ providedIn: 'root' })
export class SellerOffersService {
  constructor(private api: ApiService) {}

  loadAll(): Observable<Offer[]> {
    return this.api.getSpecialOffers().pipe(
      map((res) => {
        const raw = res.data ?? res ?? [];
        return Array.isArray(raw) ? raw : [];
      }),
      catchError(() => of([]))
    );
  }

  create(offer: Offer): Observable<Offer> {
    return this.api.createSpecialOffer(offer).pipe(map((res) => res.data ?? res));
  }

  update(offerId: string, offer: Partial<Offer>): Observable<Offer> {
    return this.api.updateSpecialOffer(offerId, offer).pipe(map((res) => res.data ?? res));
  }

  toggleActive(offerId: string, isActive: boolean): Observable<any> {
    return this.api.toggleSpecialOfferActivation(offerId, isActive);
  }

  delete(offerId: string): Observable<void> {
    return this.api.deleteSpecialOffer(offerId).pipe(map(() => void 0));
  }

  /** Returns error string or null if valid */
  validate(offer: Partial<Offer>): string | null {
    if (!offer.title?.trim() || !offer.description?.trim()) {
      return 'Please fill in title and description';
    }
    if ((offer.discount_value ?? 0) <= 0) {
      return 'Discount value must be greater than 0';
    }
    if (offer.discount_type === 'percentage' && (offer.discount_value ?? 0) > 100) {
      return 'Percentage discount cannot exceed 100%';
    }
    if (!offer.valid_from || !offer.valid_until) {
      return 'Please set a valid date range';
    }
    if (new Date(offer.valid_from) >= new Date(offer.valid_until)) {
      return 'End date must be after start date';
    }
    return null;
  }

  emptyOffer(): Offer {
    return {
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
}
import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SellerOffersService, Offer } from '../../services/seller-offers.service';
import { formatCurrency, formatDate } from '../../seller-dashboard.utils';

@Component({
  selector: 'app-promotions',
  standalone: true,
  styleUrl: '../../seller-dashboard.component.css',
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './promotions.component.html',
})
export class PromotionsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  offers: Offer[] = [];
  newOffer: Offer;
  editingOffer: Offer | null = null;
  showEditForm = false;

  offerError: string | null = null;
  offerSuccess: string | null = null;
  isSubmittingOffer = false;

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  constructor(private offersService: SellerOffersService, public router: Router) {
    this.newOffer = this.offersService.emptyOffer();
  }

  ngOnInit(): void { this.loadOffers(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  loadOffers(): void {
    this.offersService.loadAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (offers) => (this.offers = offers),
      error: () => (this.offerError = 'Failed to load offers.'),
    });
  }

  onCreateOffer(): void {
    const err = this.offersService.validate(this.newOffer);
    if (err) { this.offerError = err; return; }
    this.isSubmittingOffer = true; this.clearMessages();
    this.offersService.create(this.newOffer).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.offerSuccess = 'Offer created successfully!';
        this.isSubmittingOffer = false;
        this.newOffer = this.offersService.emptyOffer();
        this.loadOffers();
        setTimeout(() => this.clearMessages(), 3000);
      },
      error: (e) => { this.offerError = e.error?.message ?? 'Failed to create offer.'; this.isSubmittingOffer = false; },
    });
  }

  editOffer(offer: Offer): void { this.editingOffer = { ...offer }; this.showEditForm = true; this.clearMessages(); }
  cancelOfferEdit(): void { this.editingOffer = null; this.showEditForm = false; }

  onUpdateOffer(): void {
    if (!this.editingOffer?.offer_id) { this.offerError = 'Offer ID not found'; return; }
    const err = this.offersService.validate(this.editingOffer);
    if (err) { this.offerError = err; return; }
    this.isSubmittingOffer = true; this.clearMessages();
    this.offersService.update(this.editingOffer.offer_id, this.editingOffer).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.offerSuccess = 'Offer updated successfully!';
        this.isSubmittingOffer = false; this.editingOffer = null; this.showEditForm = false;
        this.loadOffers(); setTimeout(() => this.clearMessages(), 3000);
      },
      error: () => { this.offerError = 'Failed to update offer.'; this.isSubmittingOffer = false; },
    });
  }

  toggleOfferStatus(offer: Offer): void {
    if (!offer.offer_id) { this.offerError = 'Invalid offer - missing ID'; return; }
    const newStatus = !offer.is_active;
    this.offersService.toggleActive(offer.offer_id, newStatus).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { offer.is_active = res.is_active; this.offerSuccess = `Offer ${newStatus ? 'activated' : 'deactivated'} successfully`; setTimeout(() => this.clearMessages(), 3000); },
      error: () => { this.offerError = 'Failed to toggle offer status'; setTimeout(() => this.clearMessages(), 3000); },
    });
  }

  deleteOffer(offerId: string): void {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    this.offersService.delete(offerId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.offerSuccess = 'Offer deleted successfully!'; this.loadOffers(); setTimeout(() => this.clearMessages(), 3000); },
      error: () => { this.offerError = 'Failed to delete offer.'; setTimeout(() => this.clearMessages(), 3000); },
    });
  }

  private clearMessages(): void { this.offerError = null; this.offerSuccess = null; }
}

// src/app/app.component.ts
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AnalyticsService } from './services/analytics.service';
import { isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'techwave-electronics';
 
  constructor(
    private router: Router,
    private analytics: AnalyticsService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}
 
  ngOnInit(): void {
    // Starts listening to Angular router NavigationEnd events and fires
    // a GA4 page_view hit on every route change — works correctly with SSR.
    this.analytics.init();

    // Only run in the browser — sessionStorage does not exist on the server (SSR)
    if (!isPlatformBrowser(this.platformId)) return;
 
    // Capture referral code on every navigation.
    // The customer may land on any page via the referral link
    // (product page, category, homepage) — not just the root.
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.captureReferralCode();
      });
 
    // Also capture immediately on first load in case NavigationEnd
    // has already fired before this subscription is registered.
    this.captureReferralCode();
  }
 
  /**
   * Reads the ?ref= query parameter from the current URL.
   * If present, writes the agent code to sessionStorage under 'referral_code'.
   *
   * Uses sessionStorage (not localStorage) — referral tracking is
   * session-only by design (confirmed in DataFlow v2.0).
   * If the customer closes the browser or opens a new session, the code is gone.
   */
  private captureReferralCode(): void {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
 
    if (ref && ref.trim()) {
      sessionStorage.setItem('referral_code', ref.trim().toUpperCase());
    }
  }
}
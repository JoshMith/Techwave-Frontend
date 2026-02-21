// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './services/analytics.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  constructor(private analytics: AnalyticsService) {}

  ngOnInit(): void {
    // Starts listening to Angular router NavigationEnd events and fires
    // a GA4 page_view hit on every route change — works correctly with SSR.
    this.analytics.init();
  }
}
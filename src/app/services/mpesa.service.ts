// ============================================
// M-PESA SERVICE (Angular)
// ============================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, interval, switchMap, takeWhile, of } from 'rxjs';
import { ApiService } from './api.service';

export interface MPesaInitiateResponse {
  success: boolean;
  message: string;
  checkoutRequestID: string;
  merchantRequestID: string;
  customerMessage: string;
}

export interface MPesaStatusResponse {
  status: 'pending' | 'completed' | 'failed';
  resultCode: string;
  resultDesc: string;
  mpesaReceiptNumber?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MpesaService {
  apiUrl: string = '';

  constructor(private http: HttpClient, private apiService: ApiService) {
    this.apiUrl = this.apiService.apiUrl;
  }

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
    withCredentials: true, // This enables sending cookies with requests
  };

  /**
   * Initiate M-Pesa STK Push
   */
  initiateSTKPush(
    phoneNumber: string,
    amount: number,
    orderId: string
  ): Observable<MPesaInitiateResponse> {
    return this.http.post<MPesaInitiateResponse>(
      `${this.apiUrl}/mpesa/stkpush`,
      {
        phoneNumber,
        amount,
        orderId,
        accountReference: 'TechWave',
      },
      this.httpOptions
    );
  }

  /**
   * Query M-Pesa payment status
   */
  queryPaymentStatus(
    checkoutRequestID: string
  ): Observable<MPesaStatusResponse> {
    return this.http.post<MPesaStatusResponse>(
      `${this.apiUrl}/mpesa/query`,
      { checkoutRequestID },
      this.httpOptions
    );
  }

  /**
   * Poll payment status until completed or timeout
   * Checks every 10 seconds (not 5) to avoid rate limiting
   */
  pollPaymentStatus(
    checkoutRequestID: string,
    maxAttempts: number = 12
  ): Observable<MPesaStatusResponse> {
    let attempts = 0;

    return interval(10000).pipe(
      // ⚠️ Changed from 5000 to 10000 (10 seconds)
      switchMap(() => {
        attempts++;
        console.log(
          `🔄 Polling M-Pesa status... Attempt ${attempts}/${maxAttempts}`
        );
        return this.queryPaymentStatus(checkoutRequestID);
      }),
      takeWhile((response) => {
        if (attempts >= maxAttempts) {
          console.log('⏰ Max polling attempts reached');
          return false;
        }
        if (response.status === 'pending') {
          console.log('⏳ Payment still pending...');
          return true;
        }
        console.log('✅ Payment status final:', response.status);
        return false;
      }, true)
    );
  }

  /**
   * Format Kenyan phone number to +254 format required by database
   */
  formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Handle different formats:
    if (cleaned.startsWith('254') && cleaned.length === 12) {
      // Already in 254 format, add +
      return '+' + cleaned;
    } else if (cleaned.startsWith('0') && cleaned.length === 10) {
      // Convert 07... to +2547...
      return '+254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      // Convert 7... to +2547...
      return '+254' + cleaned;
    } else {
      // Return as is (will fail validation but at least we tried)
      return '+' + cleaned;
    }
  }

  /**
   * Validate Kenyan phone number
   */
  isValidKenyanPhone(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone);
    const digits = formatted.replace(/\D/g, '');
    // Kenyan numbers must be in 2547... or 2541... followed by 8 digits (total 12 digits)
    return /^254[71]\d{8}$/.test(digits);
  }
}

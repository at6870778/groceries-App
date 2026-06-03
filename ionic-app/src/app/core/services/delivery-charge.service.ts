import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppProperties } from '../config/app-properties';

export interface DeliveryCharge {
  chargeAmount: number;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeliveryChargeService {
  private readonly API_URL = `${AppProperties.apiUrl}/config/delivery-charge`;
  
  // Signal to store current delivery charge
  readonly deliveryCharge = signal<DeliveryCharge>({
    chargeAmount: 0,
    description: 'Loading...'
  });
  
  // Signal to track loading state
  readonly isLoading = signal(false);
  
  constructor(private http: HttpClient) {
    this.loadDeliveryCharge();
  }
  
  /**
   * Load delivery charge from API
   */
  loadDeliveryCharge(): void {
    this.isLoading.set(true);
    this.http.get<DeliveryCharge>(this.API_URL).subscribe({
      next: (data) => {
        this.deliveryCharge.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load delivery charge:', err);
        // Set default to 0 if API fails
        this.deliveryCharge.set({ chargeAmount: 0, description: 'Default' });
        this.isLoading.set(false);
      }
    });
  }
  
  /**
   * Get current delivery charge amount
   */
  getChargeAmount(): number {
    return this.deliveryCharge().chargeAmount;
  }
}

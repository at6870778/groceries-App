import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonInput, IonItem, IonButton, IonText, IonIcon } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { LocationService } from '../../core/services/location.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonInput, IonItem, IonButton, IonText, IonIcon],
  template: `
    <ion-content [scrollEvents]="true" [fullscreen]="false" class="ion-padding">
      <div class="hero-section">
        <div class="logo-box">
          <div class="logo">🛒</div>
          <h1>Order Kro</h1>
          <p>Fresh Groceries at Your Doorstep</p>
        </div>
      </div>
      
      <div class="form-container">
        <div class="mode-toggle">
          <button [ngClass]="{'active': mode === 'CUSTOMER'}" (click)="mode = 'CUSTOMER'">
            👤 Shop
          </button>
          <button [ngClass]="{'active': mode === 'DELIVERY_BOY'}" (click)="mode = 'DELIVERY_BOY'">
            🚴 Deliver
          </button>
        </div>

        <div class="form-section">
          <h2 *ngIf="mode === 'CUSTOMER'">Welcome Back, Shopper!</h2>
          <h2 *ngIf="mode === 'DELIVERY_BOY'">Ready to Deliver?</h2>
          <p class="subtext" *ngIf="mode === 'CUSTOMER'">Order fresh groceries & get delivery in 10 mins</p>
          <p class="subtext" *ngIf="mode === 'DELIVERY_BOY'">Manage your deliveries & earn money</p>

          <!-- Location Display -->
          <div class="location-section" *ngIf="locationService.currentLocation() as loc">
            <div class="location-box">
              <div class="location-icon">📍</div>
              <div class="location-info">
                <div class="location-label">📡 Your Location</div>
                <div class="location-coords">{{ loc.latitude.toFixed(4) }}, {{ loc.longitude.toFixed(4) }}</div>
                <div class="location-address" *ngIf="loc.address">{{ loc.address }}</div>
                <div class="location-accuracy">Accuracy: {{ (loc.accuracy || 0).toFixed(0) }}m</div>
              </div>
            </div>
          </div>

          <!-- Location Error -->
          <div class="location-error" *ngIf="locationService.locationError()">
            {{ locationService.locationError() }}
          </div>

          <div class="input-group">
            <ion-item class="input-field">
              <ion-input 
                label="Phone Number" 
                labelPlacement="floating"
                [(ngModel)]="phone" 
                type="tel" 
                maxlength="10"
                placeholder="Enter 10-digit number">
              </ion-input>
            </ion-item>
            <small class="hint">We'll send you an OTP to verify</small>
          </div>

          <div class="input-group">
            <ion-item class="input-field">
              <ion-input 
                label="Full Name" 
                labelPlacement="floating"
                [(ngModel)]="fullName"
                placeholder="Your name">
              </ion-input>
            </ion-item>
          </div>

          <ion-text color="danger" *ngIf="error">
            <p class="error-msg">{{ error }}</p>
          </ion-text>

          <div class="button-group">
            <ion-button expand="block" size="large" (click)="detectLocation()" [disabled]="loading" class="location-btn" fill="outline">
              {{ locationService.isLocating() ? '🔍 Detecting...' : '📍 Detect My Location' }}
            </ion-button>
            
            <ion-button expand="block" size="large" (click)="login()" [disabled]="loading" class="continue-btn">
              {{ loading ? '⏳ Sending OTP...' : '→ Continue' }}
            </ion-button>
          </div>

          <p class="terms">By continuing, you agree to our Terms & Conditions</p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      --ion-background-color: #ffffff;
    }

    ion-content {
      --background: linear-gradient(180deg, #fafafa 0%, #ffffff 50%);
    }

    .hero-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
      color: white;
      margin-bottom: 0;
    }

    .logo-box {
      margin-top: 30px;
    }

    .logo {
      font-size: 48px;
      margin-bottom: 12px;
      display: inline-block;
      animation: bounce 2s infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .hero-section h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 6px;
      letter-spacing: 0.5px;
    }

    .hero-section p {
      font-size: 14px;
      opacity: 0.9;
      margin: 0;
      letter-spacing: 0.3px;
    }

    .form-container {
      background: white;
      border-radius: 24px 24px 0 0;
      margin-top: -20px;
      padding: 24px 20px 30px;
      position: relative;
      z-index: 10;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
    }

    .mode-toggle {
      display: flex;
      gap: 10px;
      margin-bottom: 24px;
      background: #f0f3f8;
      padding: 4px;
      border-radius: 12px;
    }

    .mode-toggle button {
      flex: 1;
      padding: 12px 16px;
      border: none;
      border-radius: 10px;
      background: transparent;
      font-size: 14px;
      font-weight: 600;
      color: #6f7f95;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .mode-toggle button.active {
      background: white;
      color: #667eea;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
    }

    .form-section h2 {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 8px;
      color: #1a1a1a;
    }

    .subtext {
      font-size: 14px;
      color: #6f7f95;
      margin: 0 0 16px;
      line-height: 1.4;
    }

    .location-section {
      margin: 16px 0;
      padding: 12px;
      background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      border-radius: 12px;
      border: 1px solid #a5d6a7;
    }

    .location-box {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .location-icon {
      font-size: 28px;
      flex-shrink: 0;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .location-info {
      flex: 1;
    }

    .location-label {
      font-size: 12px;
      font-weight: 700;
      color: #2e7d32;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .location-coords {
      font-size: 13px;
      color: #1b5e20;
      font-weight: 600;
      margin-top: 4px;
      font-family: monospace;
    }

    .location-address {
      font-size: 12px;
      color: #2e7d32;
      margin-top: 4px;
      line-height: 1.3;
    }

    .location-accuracy {
      font-size: 11px;
      color: #558b2f;
      margin-top: 4px;
      font-style: italic;
    }

    .location-error {
      background: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      margin: 12px 0;
      border-left: 3px solid #c62828;
    }

    .input-group {
      margin-bottom: 20px;
    }

    .input-field {
      --border-radius: 12px;
      --background: #f7f9fc;
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 12px;
      --padding-bottom: 12px;
      --border-color: #e1e8f4;
      border: 1px solid #e1e8f4;
      margin: 0;
    }

    .input-field::part(native) {
      font-size: 16px;
    }

    .hint {
      display: block;
      font-size: 12px;
      color: #8a99ad;
      margin-top: 6px;
      padding: 0 4px;
    }

    .error-msg {
      background: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      margin: 12px 0;
      border-left: 3px solid #c62828;
    }

    .button-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
    }

    .location-btn {
      --background: linear-gradient(135deg, #26c281 0%, #2e8b57 100%);
      height: 48px;
      font-weight: 600;
      letter-spacing: 0.5px;
      box-shadow: 0 8px 20px rgba(38, 194, 129, 0.2);
    }

    .continue-btn {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --background-hover: linear-gradient(135deg, #5568d3 0%, #6a3f94 100%);
      height: 48px;
      font-weight: 600;
      letter-spacing: 0.5px;
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2);
    }

    .terms {
      font-size: 12px;
      color: #8a99ad;
      text-align: center;
      margin-top: 16px;
    }
  `]
})
export class DeliveryLoginPage {
  mode: 'CUSTOMER' | 'DELIVERY_BOY' = 'CUSTOMER';
  phone = '';
  fullName = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService, 
    private router: Router,
    public locationService: LocationService
  ) {
    // Auto-detect location on page load
    this.autoDetectLocation();
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    const httpErr = err as HttpErrorResponse;
    const backendMsg = httpErr?.error?.message;
    if (typeof backendMsg === 'string' && backendMsg.trim()) {
      return backendMsg;
    }
    return fallback;
  }

  /**
   * Auto-detect location on page load if not already detected
   */
  autoDetectLocation() {
    if (!this.locationService.currentLocation()) {
      this.detectLocation();
    }
  }

  /**
   * Manually detect user location
   */
  async detectLocation() {
    try {
      await this.locationService.detectCurrentLocation();
      this.error = '';
    } catch (err) {
      this.error = this.locationService.locationError() || 'Could not detect location';
    }
  }

  login() {
    this.error = '';
    if (!/^[0-9]{10}$/.test(this.phone)) {
      this.error = '📱 Please enter a valid 10-digit phone number.';
      return;
    }
    if (!this.fullName.trim()) {
      this.error = '✍️ Please enter your name.';
      return;
    }
    
    this.loading = true;
    this.auth.requestOtp(this.phone).subscribe({
      next: () => {
        this.auth.loginWithRole(this.phone, this.fullName, this.mode).subscribe({
          next: (res) => {
            const token = res?.data?.token || res?.data?.accessToken;
            if (!token) {
              this.error = '❌ Login failed. Token not received.';
              this.loading = false;
              return;
            }

            this.auth.saveToken(token, this.mode, res?.data?.phone || this.phone);
            this.loading = false;
            
            // Save user location on login
            const loc = this.locationService.currentLocation();
            if (loc) {
              sessionStorage.setItem('user_location_at_login', JSON.stringify({
                latitude: loc.latitude,
                longitude: loc.longitude,
                address: loc.address,
                timestamp: new Date().toISOString()
              }));
            }

            if (this.mode === 'DELIVERY_BOY') {
              this.router.navigateByUrl('/delivery/orders');
            } else {
              this.router.navigateByUrl('/home');
            }
          },
          error: (err) => {
            this.error = this.getErrorMessage(err, '❌ Login failed. Please try again.');
            this.loading = false; 
          }
        });
      },
      error: (err) => {
        this.error = this.getErrorMessage(err, '🌐 Could not send OTP. Check your connection.');
        this.loading = false; 
      }
    });
  }
}

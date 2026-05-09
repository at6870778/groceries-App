import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButton, IonButtons, IonBackButton, IonText } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { CartState } from '../../core/state/cart.state';
import { LocationService } from '../../core/services/location.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButton, IonButtons, IonBackButton, IonText],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>My Cart</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [scrollEvents]="true" [fullscreen]="false" class="ion-padding">
      <ng-container *ngIf="cartState.items().length > 0; else emptyCart">
        
        <!-- Location Display -->
        <div class="location-card" *ngIf="locationService.currentLocation() as loc">
          <div class="location-header">
            <span class="location-icon">📍</span>
            <span class="location-title">Delivery Location</span>
          </div>
          <div class="location-details">
            <div class="detail-row">
              <span class="label">Coordinates</span>
              <span class="value">{{ loc.latitude.toFixed(4) }}, {{ loc.longitude.toFixed(4) }}</span>
            </div>
            <div class="detail-row" *ngIf="loc.address">
              <span class="label">Address</span>
              <span class="value">{{ loc.address }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Accuracy</span>
              <span class="value">{{ (loc.accuracy || 0).toFixed(0) }}m</span>
            </div>
          </div>
        </div>

        <div class="payment-card">
          <div class="payment-title">Choose payment method</div>
          <div class="payment-subtitle">Select UPI to pay online or choose COD to pay on delivery.</div>
          <div class="payment-actions">
            <button class="mode-btn" [class.active]="paymentMode() === 'UPI'" (click)="paymentMode.set('UPI')">
              <span class="mode-icon">📱</span>
              <span>
                <strong>UPI</strong>
                <small>PhonePe / GPay / Paytm</small>
              </span>
            </button>
            <button class="mode-btn" [class.active]="paymentMode() === 'COD'" (click)="paymentMode.set('COD')">
              <span class="mode-icon">💵</span>
              <span>
                <strong>COD</strong>
                <small>Pay when delivered</small>
              </span>
            </button>
          </div>
          <div class="upi-panel" *ngIf="paymentMode() === 'UPI'">
            <div class="upi-qr">QR</div>
            <div>
              <div class="upi-label">Pay to UPI ID</div>
              <div class="upi-value">orderkro&#64;upi</div>
              <div class="upi-note">Scan and confirm payment, then place the order.</div>
            </div>
          </div>
        </div>

        <ion-list>
          <ion-item *ngFor="let i of cartState.items()">
            <ion-label>
              <h2>{{ i.name }}</h2>
              <p>Qty: {{ i.quantity }}</p>
            </ion-label>
            <ion-text slot="end"><strong>Rs {{ i.lineTotal }}</strong></ion-text>
          </ion-item>
        </ion-list>
        <div style="margin-top:16px;text-align:right;font-size:1.1rem;">
          <strong>Subtotal: Rs {{ cartState.subtotal() }}</strong>
        </div>
        <ion-button expand="block" style="margin-top:16px;" (click)="checkout()" [disabled]="checking">
          {{ checking ? 'Placing Order...' : paymentMode() === 'UPI' ? 'Pay with UPI & Place Order' : 'Place COD Order' }}
        </ion-button>
        <p *ngIf="orderMsg" [style.color]="orderMsg.includes('✅') ? 'green' : 'red'" style="text-align:center;margin-top:12px;">{{ orderMsg }}</p>
      </ng-container>
      <ng-template #emptyCart>
        <div style="text-align:center;margin-top:60px;">
          <p style="font-size:3rem;">🛒</p>
          <p>Your cart is empty</p>
          <ion-button routerLink="/products">Browse Products</ion-button>
        </div>
      </ng-template>
    </ion-content>
  `,
  styles: [`
    .location-card {
      background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      border: 1px solid #a5d6a7;
      border-radius: 14px;
      padding: 14px;
      margin-bottom: 16px;
    }

    .location-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .location-icon {
      font-size: 20px;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .location-title {
      font-weight: 700;
      color: #2e7d32;
      font-size: 14px;
    }

    .location-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }

    .label {
      font-weight: 600;
      color: #1b5e20;
    }

    .value {
      color: #2e7d32;
      font-weight: 500;
      text-align: right;
      word-break: break-word;
      flex: 0 1 50%;
    }

    .payment-card {
      background: linear-gradient(135deg, #ffffff 0%, #f4f9ff 100%);
      border: 1px solid #dfe9f6;
      border-radius: 18px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 10px 26px rgba(26, 62, 109, 0.08);
    }

    .payment-title {
      font-weight: 800;
      font-size: 1.05rem;
      color: #163d68;
    }

    .payment-subtitle {
      margin-top: 4px;
      color: #6f7f95;
      font-size: 0.92rem;
      line-height: 1.35;
    }

    .payment-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 14px;
    }

    .mode-btn {
      width: 100%;
      border: 1px solid #d8e2ef;
      border-radius: 16px;
      background: #fff;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      text-align: left;
      box-shadow: 0 6px 16px rgba(18, 49, 90, 0.05);
      cursor: pointer;
    }

    .mode-btn.active {
      border-color: #2d7ef7;
      background: linear-gradient(135deg, #eef5ff 0%, #f8fbff 100%);
      box-shadow: 0 10px 22px rgba(45, 126, 247, 0.12);
    }

    .mode-btn span {
      display: block;
    }

    .mode-btn strong {
      display: block;
      font-size: 0.98rem;
      color: #17375d;
    }

    .mode-btn small {
      display: block;
      margin-top: 2px;
      color: #6f7f95;
      font-size: 0.78rem;
    }

    .mode-icon {
      font-size: 1.35rem;
      min-width: 1.5rem;
    }

    .upi-panel {
      margin-top: 14px;
      border-radius: 16px;
      background: linear-gradient(135deg, #f6fbff 0%, #edf6ff 100%);
      border: 1px dashed #bcd2ee;
      padding: 14px;
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .upi-qr {
      width: 64px;
      height: 64px;
      border-radius: 14px;
      background: repeating-linear-gradient(45deg, #d6e8ff, #d6e8ff 6px, #ffffff 6px, #ffffff 12px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      color: #2d7ef7;
      letter-spacing: 1px;
      flex: 0 0 auto;
    }

    .upi-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6f7f95;
    }

    .upi-value {
      font-size: 1rem;
      font-weight: 800;
      color: #14395f;
      margin-top: 2px;
    }

    .upi-note {
      color: #6f7f95;
      font-size: 0.88rem;
      margin-top: 4px;
      line-height: 1.35;
    }
  `]
})
export class CartPage implements OnInit, OnDestroy {
  checking = false;
  orderMsg = '';
  readonly paymentMode = signal<'UPI' | 'COD'>('UPI');
  private destroy$ = new Subject<void>();

  constructor(
    private api: ApiService, 
    public cartState: CartState,
    public locationService: LocationService
  ) {
    // Auto-detect location on cart page load
    this.ensureLocationDetected();
  }

  ngOnInit(): void { 
    this.loadCart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Ensure location is detected when user opens cart
   */
  ensureLocationDetected() {
    if (!this.locationService.currentLocation()) {
      this.locationService.detectCurrentLocation().catch(() => {
        // Silently fail - location is optional for ordering
      });
    }
  }

  loadCart() {
    this.api.get<any>('/customer/cart')
      .pipe(takeUntil(this.destroy$))
      .subscribe((cart) => this.cartState.setItems(cart.items || []));
  }

  checkout() {
    this.checking = true;
    this.orderMsg = '';
    
      this.api.get<any[]>('/customer/profile/addresses')
        .pipe(takeUntil(this.destroy$))
        .subscribe((addresses) => {
      const firstAddress = addresses?.[0];
      if (!firstAddress) {
        this.checking = false;
        this.orderMsg = '❌ No saved address found.';
        return;
      }

      // Build checkout request with location
      const checkoutData: any = {
        addressId: firstAddress.id,
        paymentMode: this.paymentMode(),
        notes: 'Deliver fast'
      };

      // Add location if available
      const location = this.locationService.currentLocation();
      if (location) {
        checkoutData.userLocation = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        };
      }

      this.api.post('/customer/orders/checkout', checkoutData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: () => {
          this.checking = false;
          this.orderMsg = this.paymentMode() === 'UPI' 
            ? '✅ UPI payment recorded and order placed! 🎉' 
            : '✅ Cash on delivery order placed! 🎉';
          this.loadCart();
        },
        error: (err) => {
          this.checking = false;
          this.orderMsg = err?.error?.message || '❌ Order failed. Try again.';
        }
      });
    });
  }
}

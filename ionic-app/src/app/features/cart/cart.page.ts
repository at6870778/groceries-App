import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButton, IonButtons, IonBackButton, IonText } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { CartState } from '../../core/state/cart.state';
import { ActivityState } from '../../core/state/activity.state';
import { LocationService } from '../../core/services/location.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
      <ng-container *ngIf="checkoutSuccess(); else cartOrEmpty">
        <div class="success-card">
          <div class="success-emoji">✅</div>
          <h2>Order Placed Successfully</h2>
          <p>Your {{ paymentMode() === 'UPI' ? 'UPI' : 'COD' }} order has been placed.</p>
          <p class="amount" *ngIf="lastPlacedAmount() > 0">Amount: Rs {{ lastPlacedAmount() }}</p>
          <div class="success-actions">
            <ion-button expand="block" routerLink="/orders">View My Orders</ion-button>
            <ion-button expand="block" fill="outline" routerLink="/products">Continue Shopping</ion-button>
          </div>
        </div>
      </ng-container>

      <ng-template #cartOrEmpty>
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
            <button class="mode-btn" [class.active]="paymentMode() === 'UPI'" (click)="selectPaymentMode('UPI')">
              <span class="mode-icon">📱</span>
              <span>
                <strong>UPI</strong>
                <small>PhonePe / GPay / Paytm</small>
              </span>
            </button>
            <button class="mode-btn" [class.active]="paymentMode() === 'COD'" (click)="selectPaymentMode('COD')">
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
              <div class="upi-note">Tap the button below to open Razorpay and complete UPI payment securely.</div>
            </div>
          </div>
          <div class="cod-note" *ngIf="paymentMode() === 'COD'">
            You selected Cash on Delivery. Tap confirm to place the order.
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
        <ion-button expand="block" style="margin-top:16px;" (click)="checkout()" [disabled]="checking || !canCheckout()">
          {{ checking ? 'Placing Order...' : paymentMode() === 'UPI' ? 'Confirm UPI Payment & Place Order' : 'Confirm COD Order' }}
        </ion-button>
        <p *ngIf="orderMsg" [style.color]="orderMsg.includes('✅') ? 'green' : 'red'" style="text-align:center;margin-top:12px;">{{ orderMsg }}</p>
      </ng-container>
      </ng-template>
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
    .success-card {
      text-align: center;
      background: linear-gradient(135deg, #ecfff2 0%, #f8fffb 100%);
      border: 1px solid #bce4cb;
      border-radius: 16px;
      padding: 20px 14px;
      margin-top: 18px;
    }

    .success-emoji {
      font-size: 2.4rem;
      line-height: 1;
    }

    .success-card h2 {
      margin: 10px 0 6px;
      color: #1d6e3a;
    }

    .success-card p {
      margin: 0;
      color: #2a6642;
    }

    .success-card .amount {
      margin-top: 8px;
      font-weight: 700;
      color: #145b2f;
    }

    .success-actions {
      margin-top: 14px;
      display: grid;
      gap: 10px;
    }

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

    .upi-input {
      width: 100%;
      margin-top: 8px;
      border: 1px solid #c8d9ef;
      border-radius: 10px;
      padding: 10px;
      font-size: 0.9rem;
      outline: none;
      box-sizing: border-box;
      background: #fff;
    }

    .upi-confirm-btn {
      margin-top: 8px;
      width: 100%;
      border: 1px solid #c8d9ef;
      border-radius: 10px;
      padding: 10px;
      background: #fff;
      color: #24486e;
      font-weight: 600;
      cursor: pointer;
    }

    .upi-confirm-btn.active {
      border-color: #22c55e;
      background: #ebfff1;
      color: #176b3c;
    }

    .cod-note {
      margin-top: 12px;
      border-radius: 12px;
      border: 1px solid #ead7a4;
      background: #fff8e2;
      color: #7a5d16;
      font-size: 0.9rem;
      padding: 10px 12px;
    }
  `]
})
export class CartPage implements OnInit, OnDestroy {
  checking = false;
  orderMsg = '';
  readonly paymentMode = signal<'UPI' | 'COD'>('UPI');
  readonly upiReference = signal('');
  readonly upiPaymentVerified = signal(false);
  readonly checkoutSuccess = signal(false);
  readonly lastPlacedAmount = signal(0);
  private destroy$ = new Subject<void>();

  private getErrorMessage(err: any, fallback: string): string {
    const message = err?.error?.message;
    const detail = Array.isArray(err?.error?.details) ? err.error.details[0] : null;

    if (message && message !== 'Something went wrong') {
      return message;
    }

    if (detail) {
      return detail;
    }

    return fallback;
  }

  constructor(
    private api: ApiService, 
    public cartState: CartState,
    private activityState: ActivityState,
    public locationService: LocationService
  ) {
    // Auto-detect location on cart page load
    this.ensureLocationDetected();
  }

  ngOnInit(): void { 
    this.checkoutSuccess.set(false);
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

  private ensureRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.body.appendChild(script);
    });
  }

  selectPaymentMode(mode: 'UPI' | 'COD') {
    this.paymentMode.set(mode);
    this.upiPaymentVerified.set(false);
    if (mode === 'COD') {
      this.upiReference.set('');
    }
  }

  canCheckout() {
    return true;
  }

  checkout() {
    if (this.paymentMode() === 'UPI' && !this.upiPaymentVerified()) {
      this.startRazorpayUpiCheckout();
      return;
    }

    if (this.paymentMode() === 'COD') {
      const ok = window.confirm('Confirm Cash on Delivery order?');
      if (!ok) {
        return;
      }
    }

    this.placeOrderAfterPayment();
  }

  private placeOrderAfterPayment() {
    this.checking = true;
    this.orderMsg = '';
    this.checkoutSuccess.set(false);

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

      if (this.paymentMode() === 'UPI') {
        checkoutData.upiReference = this.upiReference() || 'RAZORPAY_UPI';
      }

      // Add location if available
      const location = this.locationService.currentLocation();
      if (location) {
        checkoutData.userLocation = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        };
      }

      this.api.post<any>('/customer/orders/checkout', checkoutData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: (response) => {
          const placedAmount = this.cartState.subtotal();
          const orderId = response?.id;
          
          // For UPI orders, mark as paid since payment was already verified
          if (this.paymentMode() === 'UPI' && orderId) {
            this.api.post(`/customer/orders/${orderId}/mark-paid`, {})
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  this.checking = false;
                  this.orderMsg = '✅ UPI payment recorded and order confirmed! 🎉';
                  this.lastPlacedAmount.set(placedAmount);
                  this.checkoutSuccess.set(true);
                  this.upiPaymentVerified.set(false);
                  this.activityState.log('checkout', `Placed UPI order #${orderId} for Rs ${placedAmount}`);
                  this.loadCart();
                },
                error: (err) => {
                  this.checking = false;
                  this.orderMsg = '✅ Order placed, but status update failed. Contact support if needed.';
                }
              });
          } else {
            this.checking = false;
            this.orderMsg = '✅ Cash on delivery order placed! 🎉';
            this.lastPlacedAmount.set(placedAmount);
            this.checkoutSuccess.set(true);
            this.upiPaymentVerified.set(false);
            this.activityState.log('checkout', `Placed COD order for Rs ${placedAmount}`);
            this.loadCart();
          }
        },
        error: (err) => {
          this.checking = false;
          this.orderMsg = this.getErrorMessage(err, '❌ Order failed. Try again.');
        }
      });
    });
  }

  private startRazorpayUpiCheckout() {
    this.checking = true;
    this.orderMsg = '';

    this.ensureRazorpayScript()
      .then(() => {
        this.upiPaymentVerified.set(false);
        this.api.post<any>('/customer/payments/create-order', {})
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              const data = res?.data;
              if (!data?.orderId || !data?.keyId) {
                this.checking = false;
                this.orderMsg = '❌ Could not initialize Razorpay order.';
                return;
              }

              const options: any = {
                key: data.keyId,
                amount: data.amount,
                currency: data.currency || 'INR',
                name: data.name || 'Order Kro',
                description: data.description || 'Grocery payment',
                order_id: data.orderId,
                prefill: {
                  contact: data.prefillContact || ''
                },
                method: {
                  upi: true,
                  card: true,
                  netbanking: true,
                  wallet: true,
                  emi: false,
                  paylater: true
                },
                theme: { color: '#2d7ef7' },
                handler: (payment: any) => {
                  this.verifyPaymentAndPlaceOrder(payment);
                },
                modal: {
                  ondismiss: () => {
                    this.checking = false;
                    this.orderMsg = '⚠️ Payment cancelled.';
                  }
                }
              };

              const rzp = new window.Razorpay(options);
              rzp.open();
            },
            error: (err) => {
              this.checking = false;
              this.orderMsg = this.getErrorMessage(err, '❌ Unable to create payment order.');
            }
          });
      })
      .catch(() => {
        this.checking = false;
        this.orderMsg = '❌ Could not load payment SDK.';
      });
  }

  private verifyPaymentAndPlaceOrder(payment: any) {
    const payload = {
      razorpayOrderId: payment?.razorpay_order_id,
      razorpayPaymentId: payment?.razorpay_payment_id,
      razorpaySignature: payment?.razorpay_signature
    };

    this.api.post<any>('/customer/payments/verify', payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.upiReference.set(String(payment?.razorpay_payment_id || ''));
          this.upiPaymentVerified.set(true);
          this.placeOrderAfterPayment();
        },
        error: (err) => {
          this.checking = false;
          this.orderMsg = this.getErrorMessage(err, '❌ Payment verification failed.');
        }
      });
  }
}

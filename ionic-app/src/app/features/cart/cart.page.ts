import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
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
          <p class="order-id" *ngIf="lastPlacedOrderId()">Order #{{ lastPlacedOrderId() }}</p>
          <div class="success-actions">
            <ion-button expand="block" (click)="downloadBill(lastPlacedOrderId() || 0)" *ngIf="lastPlacedOrderId()">📥 Download Receipt</ion-button>
            <ion-button expand="block" routerLink="/orders">View My Orders</ion-button>
            <ion-button expand="block" fill="outline" routerLink="/products">Continue Shopping</ion-button>
          </div>
        </div>
      </ng-container>

      <ng-template #cartOrEmpty>
      <ng-container *ngIf="cartState.items().length > 0; else emptyCart">

        <!-- ===== STEP 1: CART REVIEW ===== -->
        <ng-container *ngIf="checkoutStep() === 'cart'">

          <!-- Delivery address chip -->
          <div class="delivery-loc" *ngIf="locationService.currentLocation() as loc">
            <span>📍</span>
            <span class="loc-addr">{{ loc.address || (loc.latitude.toFixed(3) + ', ' + loc.longitude.toFixed(3)) }}</span>
          </div>

          <!-- Item list with images + stepper -->
          <div class="cart-items-list">
            <div class="cart-item" *ngFor="let item of cartState.items()">
              <img class="cart-thumb" [src]="productImage(item)" [alt]="item.name">
              <div class="cart-item-info">
                <div class="cart-item-name">{{ item.name }}</div>
                <div class="cart-item-unit">{{ scaledUnit(item.unit, item.quantity) }}</div>
                <div class="cart-item-price">₹{{ item.unitPrice }} × {{ item.quantity }}</div>
              </div>
              <div class="cart-stepper">
                <button class="cstep-btn" (click)="decrementItem(item)">−</button>
                <span class="cstep-qty">{{ item.quantity }}</span>
                <button class="cstep-btn" (click)="incrementItem(item)">+</button>
              </div>
            </div>
          </div>

          <!-- Bill Summary -->
          <div class="bill-box">
            <div class="bill-title">Bill Summary</div>
            <div class="bill-row" *ngFor="let item of cartState.items()">
              <span>{{ item.name }} × {{ item.quantity }}</span>
              <span>₹{{ item.lineTotal }}</span>
            </div>
            <div class="bill-divider"></div>
            <div class="bill-row">
              <span>Subtotal</span>
              <span>₹{{ cartState.subtotal() }}</span>
            </div>
            <div class="bill-row">
              <span>Delivery Fee</span>
              <span>₹50</span>
            </div>
            <div class="bill-divider"></div>
            <div class="bill-row total-row">
              <span>Total</span>
              <span>₹{{ cartState.subtotal() + 50 }}</span>
            </div>
          </div>

          <p *ngIf="orderMsg" style="color:red;text-align:center;margin:8px 0;">{{ orderMsg }}</p>
          <ion-button expand="block" class="proceed-btn" (click)="proceedToPayment()" [disabled]="fetchingFee()">
            {{ fetchingFee() ? 'Calculating delivery fee...' : 'Proceed to Payment →' }}
          </ion-button>
        </ng-container>

        <!-- ===== STEP 2: PAYMENT ===== -->
        <ng-container *ngIf="checkoutStep() === 'payment'">
          <button class="back-step-btn" (click)="checkoutStep.set('cart')">← Back to Cart</button>

          <!-- order summary chip -->
          <div class="order-chip">
            <span>🛒 {{ cartState.items().length }} item{{ cartState.items().length > 1 ? 's' : '' }}</span>
            <span class="chip-total">₹{{ cartState.subtotal() + deliveryFee() }} <span style="font-size:0.75rem;opacity:0.7">(incl. ₹{{ deliveryFee() }} delivery)</span></span>
          </div>

          <!-- Location + delivery fee breakdown -->
          <div class="location-card" *ngIf="locationService.currentLocation() as loc">
            <div class="location-header">
              <span class="location-icon">📍</span>
              <span class="location-title">Delivery Location</span>
            </div>
            <div class="location-details">
              <div class="detail-row" *ngIf="loc.address">
                <span class="label">Address</span>
                <span class="value">{{ loc.address }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Delivery Charge</span>
                <span class="value" style="color:#2e7d32;font-weight:700;">{{ deliveryFeeLabel() }}</span>
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
            <div class="cod-note" *ngIf="paymentMode() === 'COD' && !confirmingCod()">
              You selected Cash on Delivery. Tap confirm to place the order.
            </div>

            <!-- Inline COD confirmation -->
            <div class="cod-confirm-card" *ngIf="confirmingCod()">
              <div class="cod-confirm-title">Confirm COD Order?</div>
              <div class="cod-confirm-sub">Pay <strong>₹{{ cartState.subtotal() + deliveryFee() | number:'1.0-0' }}</strong> cash on delivery.</div>
              <div class="cod-confirm-actions">
                <button class="cod-yes-btn" (click)="confirmCod()" [disabled]="checking">✅ Yes, Place Order</button>
                <button class="cod-no-btn" (click)="confirmingCod.set(false)">Cancel</button>
              </div>
            </div>
          </div>

          <ion-button expand="block" style="margin-top:16px;" (click)="checkout()" [disabled]="checking || !canCheckout() || confirmingCod()">
            {{ checking ? 'Placing Order...' : paymentMode() === 'UPI' ? 'Confirm UPI Payment & Place Order' : 'Confirm COD Order' }}
          </ion-button>
          <p *ngIf="orderMsg" [style.color]="orderMsg.includes('✅') ? 'green' : 'red'" style="text-align:center;margin-top:12px;">{{ orderMsg }}</p>
        </ng-container>

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

    .success-card .order-id {
      margin-top: 4px;
      font-size: 0.9rem;
      color: #1d6e3a;
      font-weight: 500;
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
    .cod-confirm-card {
      margin-top: 14px;
      border-radius: 14px;
      border: 2px solid #16a34a;
      background: #f0faf5;
      padding: 14px;
      text-align: center;
    }
    .cod-confirm-title {
      font-weight: 700;
      font-size: 1rem;
      color: #14532d;
      margin-bottom: 4px;
    }
    .cod-confirm-sub {
      font-size: 0.9rem;
      color: #166534;
      margin-bottom: 14px;
    }
    .cod-confirm-actions {
      display: flex;
      gap: 10px;
    }
    .cod-yes-btn {
      flex: 1;
      background: #16a34a;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 11px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
    }
    .cod-yes-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .cod-no-btn {
      flex: 1;
      background: #f0f0f0;
      color: #444;
      border: none;
      border-radius: 10px;
      padding: 11px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
    }

    /* ===== CART REVIEW SCREEN ===== */
    .delivery-loc {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #f0faf5;
      border: 1px solid #c8e6c9;
      border-radius: 12px;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 0.85rem;
      color: #2e7d32;
      font-weight: 600;
    }
    .loc-addr {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cart-items-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }
    .cart-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e8eef8;
      padding: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .cart-thumb {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 10px;
      background: #f5f7ff;
      flex-shrink: 0;
      padding: 4px;
    }
    .cart-item-info {
      flex: 1;
      min-width: 0;
    }
    .cart-item-name {
      font-weight: 700;
      font-size: 0.92rem;
      color: #1a1a1a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cart-item-unit {
      font-size: 0.78rem;
      color: #888;
      margin-top: 2px;
    }
    .cart-item-price {
      font-size: 0.85rem;
      color: #667eea;
      font-weight: 600;
      margin-top: 4px;
    }
    .cart-stepper {
      display: flex;
      align-items: center;
      background: #16a34a;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .cstep-btn {
      background: transparent;
      border: none;
      color: #fff;
      font-size: 1.1rem;
      font-weight: 700;
      padding: 6px 10px;
      cursor: pointer;
    }
    .cstep-qty {
      color: #fff;
      font-weight: 700;
      font-size: 0.95rem;
      min-width: 22px;
      text-align: center;
    }
    /* Bill summary */
    .bill-box {
      background: #fff;
      border: 1px solid #e8eef8;
      border-radius: 16px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .bill-title {
      font-weight: 800;
      font-size: 1rem;
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    .bill-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.88rem;
      color: #444;
      padding: 4px 0;
    }
    .bill-divider {
      border-top: 1px dashed #d8def0;
      margin: 8px 0;
    }
    .total-row {
      font-weight: 800;
      font-size: 1rem;
      color: #1a1a1a;
    }
    .proceed-btn {
      --background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
      --border-radius: 14px;
      font-weight: 700;
      font-size: 1rem;
    }
    /* Step 2 back button + order chip */
    .back-step-btn {
      background: none;
      border: none;
      color: #667eea;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0;
      margin-bottom: 12px;
      cursor: pointer;
    }
    .order-chip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f0faf5;
      border: 1px solid #c8e6c9;
      border-radius: 12px;
      padding: 8px 14px;
      margin-bottom: 14px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #2e7d32;
    }
    .chip-total {
      font-weight: 800;
      color: #16a34a;
      font-size: 1rem;
    }
  `]
})
export class CartPage implements OnInit, OnDestroy {
  checking = false;
  orderMsg = '';
  readonly checkoutStep = signal<'cart' | 'payment'>('cart');
  readonly paymentMode = signal<'UPI' | 'COD'>('UPI');
  readonly confirmingCod = signal(false);
  readonly upiReference = signal('');
  readonly upiPaymentVerified = signal(false);
  readonly checkoutSuccess = signal(false);
  readonly lastPlacedAmount = signal(0);
  readonly lastPlacedOrderId = signal<number | null>(null);
  readonly deliveryFee = signal(50);
  readonly deliveryFeeLabel = signal('₹50 (standard)');
  readonly fetchingFee = signal(false);
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
    private http: HttpClient,
    public cartState: CartState,
    private activityState: ActivityState,
    public locationService: LocationService
  ) {
    // Auto-detect location on cart page load
    this.ensureLocationDetected();
  }

  ngOnInit(): void {
    this.checkoutSuccess.set(false);
    this.checkoutStep.set('cart');
  }

  ionViewWillEnter(): void {
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

  incrementItem(item: any) {
    const pid = Number(item.productId);
    this.cartState.addOrIncrement({ id: pid, name: item.name, sellingPrice: item.unitPrice, unit: item.unit });
    this.api.post('/customer/cart/items', { productId: pid, quantity: 1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cart: any) => {
          if (cart?.items) this.cartState.setItems(cart.items);
        },
        error: () => {}
      });
  }

  decrementItem(item: any) {
    const pid = Number(item.productId);
    this.cartState.removeOrDecrement({ id: pid });
    this.api.post('/customer/cart/items', { productId: pid, quantity: -1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cart: any) => {
          if (cart?.items) this.cartState.setItems(cart.items);
        },
        error: () => {} // local state already updated
      });
    banana: 'assets/items/banana.svg', milk: 'assets/items/milk.svg',
    tomato: 'assets/items/tomato.svg', bread: 'assets/items/bread.svg',
    juice: 'assets/items/juice.svg', chips: 'assets/items/chips.svg',
    rice: 'assets/items/rice.svg', atta: 'assets/items/atta.svg',
    dal: 'assets/items/toor-daal.svg', daal: 'assets/items/toor-daal.svg',
    sugar: 'assets/items/chini.svg', jeera: 'assets/items/jeera.svg',
    dishwash: 'assets/items/dishwash.svg', surf: 'assets/items/surf-excel.svg',
  };

  productImage(item: any): string {
    if (item?.imageUrl) return item.imageUrl;
    const name = String(item?.name || '').toLowerCase();
    const match = Object.keys(this.productPhotoByKeyword).find(k => name.includes(k));
    return match ? this.productPhotoByKeyword[match]
      : 'assets/items/placeholder.svg';
  }

  scaledUnit(unit: string, qty: number): string {
    if (!unit || qty <= 1) return unit || '';
    const match = unit.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
    if (!match) return unit;
    const base = parseFloat(match[1]);
    const suffix = match[2].trim();
    const total = base * qty;
    const lo = suffix.toLowerCase();
    if (lo === 'g' || lo === 'gm' || lo === 'gms' || lo === 'gram' || lo === 'grams') {
      if (total >= 1000) { const v = total / 1000; return `${v % 1 === 0 ? v : v.toFixed(1)} kg`; }
      return `${total} ${suffix}`;
    }
    if (lo === 'ml') {
      if (total >= 1000) { const v = total / 1000; return `${v % 1 === 0 ? v : v.toFixed(1)} L`; }
      return `${total} ml`;
    }
    const v = total % 1 === 0 ? total : parseFloat(total.toFixed(1));
    return `${v} ${suffix}`;
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

  proceedToPayment() {
    const loc = this.locationService.currentLocation();
    if (!loc) {
      this.checkoutStep.set('payment');
      return;
    }
    this.fetchingFee.set(true);
    this.api.get<any>(`/customer/orders/delivery-fee?lat=${loc.latitude}&lng=${loc.longitude}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.deliveryFee.set(Number(res.fee) || 50);
          this.deliveryFeeLabel.set(res.feeLabel || `₹${res.fee}`);
          this.fetchingFee.set(false);
          this.checkoutStep.set('payment');
        },
        error: (err) => {
          this.fetchingFee.set(false);
          // If out of range, show error, else use default ₹50
          const msg = err?.error?.message || '';
          if (msg.includes('beyond') || msg.includes('km')) {
            this.orderMsg = '❌ ' + msg;
          } else {
            this.deliveryFee.set(50);
            this.deliveryFeeLabel.set('₹50 (standard)');
            this.checkoutStep.set('payment');
          }
        }
      });
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
      this.confirmingCod.set(true);
      return;
    }
    this.placeOrderAfterPayment();
  }

  confirmCod() {
    this.confirmingCod.set(false);
    this.placeOrderAfterPayment();
  }

  private placeOrderAfterPayment() {
    this.checking = true;
    this.orderMsg = '';
    this.checkoutSuccess.set(false);

    // Address check temporarily skipped — order allowed without saved address
    const placeOrder = () => {
      // Build checkout request with location
      const checkoutData: any = {
        paymentMode: this.paymentMode(),
        notes: 'Deliver fast'
      };

      if (this.paymentMode() === 'UPI') {
        checkoutData.upiReference = this.upiReference() || 'RAZORPAY_UPI';
      }

      // Add location for dynamic delivery fee calculation
      const location = this.locationService.currentLocation();
      if (location) {
        checkoutData.customerLat = location.latitude;
        checkoutData.customerLng = location.longitude;
      }

      this.api.post<any>('/customer/orders/checkout', checkoutData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: (response) => {
          const placedAmount = this.cartState.subtotal() + this.deliveryFee();
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
                  this.lastPlacedOrderId.set(orderId);
                  this.checkoutSuccess.set(true);
                  this.upiPaymentVerified.set(false);
                  this.activityState.log('checkout', `Placed UPI order #${orderId} for Rs ${placedAmount}`);
                  // Auto-download bill after 1 second
                  setTimeout(() => this.downloadBill(orderId), 1000);
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
            this.lastPlacedOrderId.set(orderId);
            this.checkoutSuccess.set(true);
            this.upiPaymentVerified.set(false);
            this.activityState.log('checkout', `Placed COD order for Rs ${placedAmount}`);
            // Auto-download bill after 1 second
            if (orderId) {
              setTimeout(() => this.downloadBill(orderId), 1000);
            }
            this.loadCart();
          }
        },
        error: (err) => {
          this.checking = false;
          this.orderMsg = this.getErrorMessage(err, '❌ Order failed. Try again.');
        }
      });
    };
    placeOrder();
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

  downloadBill(orderId: number) {
    if (!orderId) return;

    this.http.get(this.api.buildUrl(`/customer/orders/${orderId}/bill`), { responseType: 'blob' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (blob) => {
          const fileName = `Order-${orderId}-receipt.pdf`;

          if (Capacitor.isNativePlatform()) {
            // Native Android: write to cache dir then share/open
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1];
              try {
                const result = await Filesystem.writeFile({
                  path: fileName,
                  data: base64,
                  directory: Directory.Cache
                });
                await Share.share({
                  title: `Receipt - Order #${orderId}`,
                  url: result.uri,
                  dialogTitle: 'Open or share your receipt'
                });
              } catch (e) {
                this.orderMsg = '❌ Could not open receipt.';
              }
            };
            reader.readAsDataURL(blob);
          } else {
            // Web browser: standard anchor download
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
          }
        },
        error: (err) => {
          this.orderMsg = this.getErrorMessage(err, '❌ Could not download receipt.');
        }
      });
  }
}

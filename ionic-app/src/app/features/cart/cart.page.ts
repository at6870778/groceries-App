import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { IonContent, IonFooter, IonHeader, IonTitle, IonToolbar, IonButton } from '@ionic/angular/standalone';
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
  imports: [CommonModule, RouterLink, IonContent, IonFooter, IonHeader, IonTitle, IonToolbar, IonButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>My Cart</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [scrollEvents]="true" [fullscreen]="false" class="ion-padding" style="--padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px))">
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
          <div class="delivery-loc">
            <span>📍</span>
            <span class="loc-addr">{{ selectedAddressLabel() }}</span>
            <button class="loc-change-btn" (click)="openAddressPicker()">Change</button>
          </div>

          <!-- Address picker bottom sheet -->
          <div class="addr-picker-overlay" *ngIf="showAddressPicker()" (click)="showAddressPicker.set(false)"></div>
          <div class="addr-picker-sheet" *ngIf="showAddressPicker()">
            <div class="addr-picker-title">Select Delivery Address</div>

            <!-- Detect live GPS option -->
            <div class="addr-picker-item" [class.selected]="selectedAddressId() === 'gps'" (click)="selectGpsAddress()">
              <span class="addr-item-icon">📡</span>
              <div class="addr-item-body">
                <div class="addr-item-label">Use Current Location</div>
                <div class="addr-item-line">{{ locationService.currentLocation()?.address || (locationService.isLocating() ? 'Detecting…' : 'Tap to detect GPS') }}</div>
              </div>
              <span class="addr-tick" *ngIf="selectedAddressId() === 'gps'">✓</span>
            </div>

            <!-- Saved addresses -->
            <div class="addr-picker-item" *ngFor="let a of savedAddresses()"
                 [class.selected]="selectedAddressId() === a.id"
                 (click)="selectSavedAddress(a)">
              <span class="addr-item-icon">🏠</span>
              <div class="addr-item-body">
                <div class="addr-item-label">{{ a.label || 'Address' }}</div>
                <div class="addr-item-line">{{ a.line1 || a.addressLine1 }}{{ a.city ? ', ' + a.city : '' }}</div>
              </div>
              <span class="addr-tick" *ngIf="selectedAddressId() === a.id">✓</span>
            </div>

            <!-- No saved addresses + GPS unavailable -->
            <div *ngIf="savedAddresses().length === 0 && !locationService.currentLocation()" class="addr-picker-empty">
              <p>No saved addresses found.</p>
              <button class="loc-retry-btn" (click)="detectGpsFromPicker()" [disabled]="locationService.isLocating()">
                📍 {{ locationService.isLocating() ? 'Detecting...' : 'Detect my GPS location' }}
              </button>
              <button class="addr-manual-btn" routerLink="/profile">+ Add Address in Profile</button>
            </div>

            <button class="addr-picker-close" (click)="showAddressPicker.set(false)">Done</button>
          </div>

          <!-- Item list with images + stepper -->
          <div class="cart-items-list">
            <div class="cart-item" *ngFor="let item of cartState.items()">
              <img *ngIf="item.imageUrl" class="cart-thumb" [src]="item.imageUrl" [alt]="item.name">
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

          <!-- Free delivery nudge / congratulation -->
          <div class="free-del-congrats" *ngIf="cartState.subtotal() >= 299">
            🎉 Woohoo! <strong>FREE delivery</strong> unlocked on this order!
          </div>
          <div class="free-del-nudge" *ngIf="cartState.subtotal() < 299 && cartState.subtotal() > 0">
            🛒 Add <strong>₹{{ amountToFreeDelivery() }} more</strong> to get <strong>FREE delivery!</strong>
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
              <span [style.color]="deliveryFee() === 0 ? '#2e7d32' : 'inherit'" [style.fontWeight]="deliveryFee() === 0 ? '700' : 'normal'">{{ deliveryFeeLabel() }}</span>
            </div>
            <div class="bill-divider"></div>
            <div class="bill-row total-row">
              <span>Total</span>
              <span>₹{{ cartState.subtotal() + deliveryFee() }}</span>
            </div>
          </div>

          <p *ngIf="orderMsg" style="color:red;text-align:center;margin:8px 0;">{{ orderMsg }}</p>
        </ng-container>

        <!-- ===== STEP 2: PAYMENT ===== -->
        <ng-container *ngIf="checkoutStep() === 'payment'">
          <button class="back-step-btn" (click)="checkoutStep.set('cart')">← Back to Cart</button>

          <!-- order summary chip -->
          <div class="order-chip">
            <span>🛒 {{ cartState.items().length }} item{{ cartState.items().length > 1 ? 's' : '' }}</span>
            <span class="chip-total" *ngIf="deliveryFee() === 0">
              ₹{{ cartState.subtotal() }} <span style="font-size:0.75rem;color:#2e7d32;font-weight:700">🎉 FREE delivery!</span>
            </span>
            <span class="chip-total" *ngIf="deliveryFee() > 0">
              ₹{{ cartState.subtotal() + deliveryFee() }} <span style="font-size:0.75rem;opacity:0.7">(incl. ₹20 delivery)</span>
            </span>
          </div>

          <!-- Free delivery celebration banner on payment step -->
          <div class="free-del-congrats" *ngIf="deliveryFee() === 0">
            🎉 Great choice! Your order qualifies for <strong>FREE delivery!</strong>
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
                <span class="value" [style.color]="deliveryFee() === 0 ? '#2e7d32' : '#2e7d32'" style="font-weight:700;">{{ deliveryFeeLabel() }}</span>
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

    <!-- Sticky footer: always above system nav bar -->
    <ion-footer *ngIf="!checkoutSuccess() && cartState.items().length > 0">
      <ion-toolbar class="footer-toolbar">
        <ion-button *ngIf="checkoutStep() === 'cart'" expand="block" class="proceed-btn" (click)="proceedToPayment()">
          Proceed to Payment →
        </ion-button>
        <ion-button *ngIf="checkoutStep() === 'payment'" expand="block" class="checkout-btn" (click)="checkout()" [disabled]="checking || !canCheckout() || confirmingCod()">
          {{ checking ? 'Placing Order...' : paymentMode() === 'UPI' ? 'Confirm UPI Payment & Place Order' : 'Confirm COD Order' }}
        </ion-button>
      </ion-toolbar>
    </ion-footer>
    <!-- Android system nav button safe area — dark strip consistent with home screen -->
    <div style="position:fixed;bottom:0;left:0;right:0;height:env(safe-area-inset-bottom,0px);background:#111;z-index:999;pointer-events:none;"></div>
  `,
  styles: [`
    .success-box {
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
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .loc-change-btn {
      flex-shrink: 0;
      background: none;
      border: 1px solid #2e7d32;
      border-radius: 8px;
      color: #2e7d32;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 2px 8px;
      cursor: pointer;
    }
    .loc-change-btn:disabled { opacity: 0.5; cursor: default; }
    .loc-retry-btn {
      display: block;
      width: 100%;
      margin: 8px 0 4px;
      padding: 10px;
      background: #1a73e8;
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
    }
    .loc-retry-btn:disabled { opacity: 0.6; cursor: default; }
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
    .footer-toolbar {
      --background: #fff;
      --padding-start: 12px;
      --padding-end: 12px;
      --padding-top: 8px;
      --padding-bottom: 8px;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.08);
    }
    .proceed-btn {
      --background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
      --border-radius: 14px;
      font-weight: 700;
      font-size: 1rem;
      margin: 0;
    }
    .checkout-btn {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --border-radius: 14px;
      font-weight: 700;
      font-size: 1rem;
      margin: 0;
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
    .free-del-congrats {
      background: linear-gradient(135deg, #e8f5e9, #f1fff4);
      border: 1.5px solid #66bb6a;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 12px;
      font-size: 0.92rem;
      color: #1b5e20;
      text-align: center;
      animation: pop-in 0.35s cubic-bezier(.175,.885,.32,1.275);
    }
    .free-del-nudge {
      background: linear-gradient(135deg, #fff8e1, #fffdf0);
      border: 1.5px solid #ffd54f;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 12px;
      font-size: 0.92rem;
      color: #6d4c00;
      text-align: center;
    }
    @keyframes pop-in {
      0% { transform: scale(0.88); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    /* ===== ADDRESS PICKER ===== */
    .addr-picker-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 900;
    }
    .addr-picker-sheet {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: #fff; border-radius: 20px 20px 0 0;
      padding: 20px 16px 32px; z-index: 901;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.15);
      max-height: 75vh; overflow-y: auto;
    }
    .addr-picker-title {
      font-weight: 800; font-size: 1rem; color: #1a1a1a; margin-bottom: 14px; text-align: center;
    }
    .addr-picker-item {
      display: flex; align-items: center; gap: 12px;
      border: 1px solid #e8eef8; border-radius: 14px; padding: 12px 14px;
      margin-bottom: 10px; cursor: pointer; background: #fafcff;
    }
    .addr-picker-item.selected { border-color: #16a34a; background: #f0faf5; }
    .addr-item-icon { font-size: 1.4rem; flex-shrink: 0; }
    .addr-item-body { flex: 1; min-width: 0; }
    .addr-item-label { font-weight: 700; font-size: 0.9rem; color: #1a1a1a; }
    .addr-item-line { font-size: 0.8rem; color: #666; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .addr-tick { color: #16a34a; font-weight: 900; font-size: 1.1rem; flex-shrink: 0; }
    .addr-picker-empty { text-align: center; padding: 12px 0; color: #888; }
    .addr-picker-empty p { margin-bottom: 10px; }
    .addr-manual-btn {
      display: block; width: 100%; margin-top: 8px;
      padding: 10px; background: #fff; color: #667eea;
      border: 1.5px solid #667eea; border-radius: 12px;
      font-size: 0.9rem; font-weight: 700; cursor: pointer;
    }
    .addr-picker-close {
      display: block; width: 100%; margin-top: 14px;
      padding: 12px; background: #16a34a; color: #fff;
      border: none; border-radius: 14px; font-size: 1rem; font-weight: 700; cursor: pointer;
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
  readonly deliveryFee = computed(() => this.cartState.subtotal() >= 299 ? 0 : 20);
  readonly deliveryFeeLabel = computed(() => this.cartState.subtotal() >= 299 ? 'FREE 🎉' : '₹20');
  readonly amountToFreeDelivery = computed(() => Math.max(0, 299 - this.cartState.subtotal()));
  readonly refetchingLoc = signal(false);
  readonly savedAddresses = signal<any[]>([]);
  readonly selectedAddressId = signal<any>('gps'); // 'gps' | address.id
  readonly selectedAddress = signal<any | null>(null); // null = use GPS
  readonly showAddressPicker = signal(false);

  readonly selectedAddressLabel = computed(() => {
    const addr = this.selectedAddress();
    if (addr) return `${addr.label ? addr.label + ': ' : ''}${addr.line1 || addr.addressLine1 || ''}${addr.city ? ', ' + addr.city : ''}`;
    const loc = this.locationService.currentLocation();
    if (loc?.address) return loc.address;
    if (this.locationService.isLocating()) return 'Detecting location…';
    return 'No address selected – tap Change';
  });

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
    this.loadSavedAddresses();
    if (!this.locationService.currentLocation()) {
      this.locationService.detectCurrentLocation().catch(() => {});
    }
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

  loadSavedAddresses() {
    this.api.get<any[]>('/customer/profile/addresses')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.savedAddresses.set(res || []);
          // Auto-select default saved address if no address chosen yet and GPS unavailable
          if (this.selectedAddressId() === 'gps' && !this.locationService.currentLocation()) {
            const def = (res || []).find((a: any) => a.isDefault) || (res || [])[0];
            if (def) {
              this.selectedAddress.set(def);
              this.selectedAddressId.set(def.id);
            }
          }
        },
        error: () => {}
      });
  }

  openAddressPicker() {
    this.showAddressPicker.set(true);
  }

  selectGpsAddress() {
    this.selectedAddress.set(null);
    this.selectedAddressId.set('gps');
    this.showAddressPicker.set(false);
    if (!this.locationService.currentLocation()) {
      this.locationService.detectCurrentLocation().catch(() => {});
    }
  }

  selectSavedAddress(addr: any) {
    this.selectedAddress.set(addr);
    this.selectedAddressId.set(addr.id);
    this.showAddressPicker.set(false);
  }

  detectGpsFromPicker() {
    this.locationService.detectCurrentLocation()
      .then(() => {
        this.selectedAddress.set(null);
        this.selectedAddressId.set('gps');
        this.showAddressPicker.set(false);
      })
      .catch(() => {});
  }

  loadCart() {
    this.api.get<any>('/customer/cart')
      .pipe(takeUntil(this.destroy$))
      .subscribe((cart) => this.cartState.setItems(cart.items || []));
  }

  incrementItem(item: any) {
    const pid = Number(item.productId);
    const newQty = Number(item.quantity || 0) + 1;
    this.cartState.addOrIncrement({ id: pid, name: item.name, sellingPrice: item.unitPrice, unit: item.unit });
    this.api.post('/customer/cart/items', { productId: pid, quantity: newQty })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {},
        error: () => { this.loadCart(); }
      });
  }

  decrementItem(item: any) {
    const pid = Number(item.productId);
    const currentQty = Number(item.quantity || 1);
    this.cartState.removeOrDecrement({ id: pid });
    const request$ = currentQty <= 1
      ? this.api.delete(`/customer/cart/items/${pid}`)
      : this.api.post('/customer/cart/items', { productId: pid, quantity: currentQty - 1 });
    request$.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {},
        error: () => { this.loadCart(); }
      });
  }

  productImage(item: any): string {
    return (item?.imageUrl && String(item.imageUrl).startsWith('http')) ? item.imageUrl : '';
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
    const saved = this.selectedAddress();
    const loc = this.locationService.currentLocation();
    if (!saved && !loc) {
      if (this.savedAddresses().length > 0) {
        this.orderMsg = '📍 Please select a delivery address.';
        this.showAddressPicker.set(true);
      } else {
        this.orderMsg = '📍 Please add an address in your Profile or enable GPS.';
      }
      return;
    }
    this.checkoutStep.set('payment');
  }

  canCheckout() {
    return true;
  }

  detectAndRetry(): void {
    this.refetchingLoc.set(true);
    this.orderMsg = '';
    this.locationService.detectCurrentLocation()
      .then(() => {
        this.refetchingLoc.set(false);
        this.proceedToPayment();
      })
      .catch(() => {
        this.refetchingLoc.set(false);
        this.orderMsg = '❌ Could not detect location. Please allow location access and try again.';
      });
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

      // Use selected address coords, or fall back to GPS
      const saved = this.selectedAddress();
      if (saved?.latitude && saved?.longitude) {
        checkoutData.customerLat = saved.latitude;
        checkoutData.customerLng = saved.longitude;
      } else {
        const location = this.locationService.currentLocation();
        if (location) {
          checkoutData.customerLat = location.latitude;
          checkoutData.customerLng = location.longitude;
        }
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

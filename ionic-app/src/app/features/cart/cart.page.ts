import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { CartState } from '../../core/state/cart.state';
import { ActivityState } from '../../core/state/activity.state';
import { LocationService } from '../../core/services/location.service';
import { DeliveryChargeService } from '../../core/services/delivery-charge.service';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

declare global {
  interface Window {
    Razorpay: any;
  }
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, IonButton, BottomNavComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>My Cart</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [scrollEvents]="true" [fullscreen]="false" class="ion-padding" style="--padding-bottom: calc(130px + env(safe-area-inset-bottom, 0px))">
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
            <ion-button expand="block" fill="outline" routerLink="/home">Continue Shopping</ion-button>
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
                <div class="addr-item-label" *ngIf="a.label">{{ a.label }}</div>
                <div class="addr-item-line">{{ formatAddress(a) }}</div>
              </div>
              <span class="addr-tick" *ngIf="selectedAddressId() === a.id">✓</span>
            </div>

            <!-- No saved addresses + GPS unavailable -->
            <div *ngIf="savedAddresses().length === 0 && !locationService.currentLocation()" class="addr-picker-empty">
              <p>No saved addresses found.</p>
              <button class="loc-retry-btn" (click)="detectGpsFromPicker()" [disabled]="locationService.isLocating()">
                📍 {{ locationService.isLocating() ? 'Detecting...' : 'Detect my GPS location' }}
              </button>
            </div>

            <!-- Add New Address Button -->
            <button class="addr-add-new-btn" (click)="showAddNewAddressForm.set(true)">
              ➕ Add New Address
            </button>

            <button class="addr-picker-close" (click)="showAddressPicker.set(false)">Done</button>

            <!-- Add New Address Form (Inline Modal) -->
            <div class="addr-form-overlay" *ngIf="showAddNewAddressForm()" (click)="showAddNewAddressForm.set(false)"></div>
            <div class="addr-form-modal" *ngIf="showAddNewAddressForm()">
              <div class="addr-form-header">
                <h3>Add New Address</h3>
                <button class="addr-form-close" (click)="showAddNewAddressForm.set(false)">✕</button>
              </div>

              <form class="addr-form" (ngSubmit)="addNewAddressAndSelect()">
                <!-- Village (Mandatory) -->
                <div class="form-group">
                  <label>Village/Area <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newAddressForm.village" name="village" 
                         placeholder="e.g., Whitefield, Indiranagar" required>
                  <small *ngIf="!newAddressForm.village" class="error">Village is required</small>
                </div>

                <!-- Landmark (Mandatory) -->
                <div class="form-group">
                  <label>Landmark <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newAddressForm.landmark" name="landmark" 
                         placeholder="e.g., Near Metro Station, Next to Mall" required>
                  <small *ngIf="!newAddressForm.landmark" class="error">Landmark is required</small>
                </div>

                <!-- Post/Post Office (Mandatory) -->
                <div class="form-group">
                  <label>Post/Post Office <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newAddressForm.post" name="post" 
                         placeholder="e.g., Whitefield Post Office" required>
                  <small *ngIf="!newAddressForm.post" class="error">Post is required</small>
                </div>

                <!-- Pincode (Optional) -->
                <div class="form-group">
                  <label>Pincode</label>
                  <input type="text" [(ngModel)]="newAddressForm.pincode" name="pincode" 
                         placeholder="e.g., 560066">
                </div>

                <!-- District (Optional) -->
                <div class="form-group">
                  <label>District</label>
                  <input type="text" [(ngModel)]="newAddressForm.district" name="district" 
                         placeholder="e.g., Bengaluru Urban">
                </div>

                <!-- Action Buttons -->
                <div class="addr-form-actions">
                  <button type="button" class="btn-cancel" (click)="showAddNewAddressForm.set(false)">Cancel</button>
                  <button type="submit" class="btn-save" 
                          [disabled]="!newAddressForm.village || !newAddressForm.landmark || !newAddressForm.post">
                    Save & Select
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Village + Landmark prompt before payment -->
          <div class="loc-prompt-overlay" *ngIf="showLocationDetailsPrompt()"></div>
          <div class="loc-prompt-card" *ngIf="showLocationDetailsPrompt()">
            <div class="loc-prompt-icon">📍</div>
            <div class="loc-prompt-title">Delivery details required</div>
            <p class="loc-prompt-hint">Help your delivery partner find you quickly</p>

            <div class="loc-field">
              <label class="loc-label">🏘 Village / Area <span class="loc-req">*</span></label>
              <input class="loc-input" type="text" maxlength="120" [(ngModel)]="checkoutVillage"
                placeholder="e.g. Shivajinagar, Sector 4" autocomplete="off" />
            </div>

            <div class="loc-field">
              <label class="loc-label">🏠 Landmark <span class="loc-req">*</span></label>
              <input class="loc-input" type="text" maxlength="120" [(ngModel)]="checkoutLandmark"
                placeholder="e.g. Near Ram Mandir, behind school" autocomplete="off" />
            </div>

            <p class="loc-error" *ngIf="locationDetailsError()">⚠️ {{ locationDetailsError() }}</p>

            <button class="loc-save-btn" (click)="saveLocationDetailsAndProceed()" [disabled]="savingLocationDetails()">
              {{ savingLocationDetails() ? 'Saving...' : 'Confirm & Proceed to Payment →' }}
            </button>
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

          <!-- order summary chip -->
          <div class="order-chip">
            <span>🛒 {{ cartState.items().length }} item{{ cartState.items().length > 1 ? 's' : '' }}</span>
            <span class="chip-total" *ngIf="deliveryFee() === 0">
              ₹{{ cartState.subtotal() }} <span style="font-size:0.75rem;color:#2e7d32;font-weight:700">🎉 FREE delivery!</span>
            </span>
            <span class="chip-total" *ngIf="deliveryFee() > 0">
              ₹{{ cartState.subtotal() + deliveryFee() }} <span style="font-size:0.75rem;opacity:0.7">(incl. ₹{{ Math.round(deliveryFee()) }} delivery)</span>
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
              <div class="detail-row">
                <span class="label">Full Address</span>
                <span class="value">{{ formattedDeliveryAddress() }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Delivery Charge</span>
                <span class="value" [style.color]="deliveryFee() === 0 ? '#2e7d32' : '#2e7d32'" style="font-weight:700;">{{ deliveryFeeLabel() }}</span>
              </div>
            </div>
          </div>

          <div class="payment-card">
            <div class="payment-title">Choose payment method</div>
            <div class="payment-subtitle">Pick how you'd like to pay for your order.</div>
            <div class="payment-actions">
              <button class="mode-btn mode-btn-upi" [class.active]="paymentMode() === 'UPI'" (click)="selectPaymentMode('UPI')">
                <span class="mode-icon">📱</span>
                <span>
                  <strong>UPI <span class="soon-badge">Soon</span></strong>
                  <small>PhonePe / GPay / Paytm</small>
                </span>
              </button>
              <button class="mode-btn mode-btn-cod" [class.active]="paymentMode() === 'COD'" (click)="selectPaymentMode('COD')">
                <span class="mode-icon">💵</span>
                <span>
                  <strong>Cash on Delivery</strong>
                  <small>Pay when delivered</small>
                </span>
              </button>
            </div>

            <!-- UPI coming-soon notice -->
            <div class="upi-coming-soon" *ngIf="paymentMode() === 'UPI'">
              <div class="upi-coming-icon">🚀</div>
              <div class="upi-coming-title">UPI payments coming very soon!</div>
              <div class="upi-coming-msg">
                We're working hard to bring you a seamless UPI experience with
                PhonePe, Google Pay & Paytm. Stay tuned — it'll be worth the wait! 🎉
              </div>
              <button class="upi-switch-btn" (click)="selectPaymentMode('COD')">
                👉 Use Cash on Delivery for now
              </button>
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

    <!-- Action button — fixed above the bottom nav on BOTH cart and payment steps -->
    <div class="action-footer" *ngIf="!checkoutSuccess() && cartState.items().length > 0 && !showLocationDetailsPrompt()">
      <ion-button *ngIf="checkoutStep() === 'cart'" expand="block" class="proceed-btn" (click)="proceedToPayment()">
        Proceed to Payment →
      </ion-button>
      <ion-button *ngIf="checkoutStep() === 'payment'" expand="block" class="checkout-btn" (click)="checkout()" [disabled]="checking || !canCheckout() || confirmingCod() || paymentMode() === 'UPI'">
        {{ checking ? 'Placing Order...' : paymentMode() === 'UPI' ? '⚠️ UPI Not Available — Switch to COD' : 'Confirm COD Order' }}
      </ion-button>
    </div>
    <app-bottom-nav></app-bottom-nav>
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
      flex-direction: column;
      gap: 6px;
      font-size: 12px;
    }

    .label {
      font-weight: 600;
      color: #1b5e20;
    }

    .value {
      color: #2e7d32;
      font-weight: 500;
      text-align: left;
      word-break: break-word;
      white-space: normal;
      line-height: 1.4;
      padding: 8px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 8px;
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
      border: 2px solid #d8e2ef;
      border-radius: 16px;
      background: #fff;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      text-align: left;
      box-shadow: 0 6px 16px rgba(18, 49, 90, 0.05);
      cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s, opacity 0.2s;
    }

    /* UPI button — visually subdued to signal unavailability */
    .mode-btn-upi {
      opacity: 0.65;
      border-style: dashed;
    }
    .mode-btn-upi.active {
      opacity: 1;
      border-style: dashed;
      border-color: #f59e0b;
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      box-shadow: 0 6px 18px rgba(245,158,11,0.15);
    }

    .mode-btn-cod.active {
      border-color: #16a34a;
      background: linear-gradient(135deg, #f0faf5 0%, #ecfdf5 100%);
      box-shadow: 0 10px 22px rgba(22, 163, 74, 0.15);
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

    /* "Soon" pill badge on UPI label */
    .soon-badge {
      display: inline-block;
      font-size: 0.6rem;
      font-weight: 800;
      background: linear-gradient(135deg, #f59e0b, #fbbf24);
      color: #fff;
      padding: 1px 6px;
      border-radius: 20px;
      vertical-align: middle;
      margin-left: 4px;
      letter-spacing: 0.04em;
    }

    /* UPI coming-soon panel */
    .upi-coming-soon {
      margin-top: 14px;
      border-radius: 18px;
      background: linear-gradient(135deg, #fffbeb 0%, #fef9ee 100%);
      border: 1.5px dashed #fbbf24;
      padding: 20px 16px;
      text-align: center;
      animation: fadeSlideIn 0.35s ease;
    }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .upi-coming-icon { font-size: 2rem; line-height: 1; margin-bottom: 8px; }
    .upi-coming-title {
      font-size: 1rem;
      font-weight: 800;
      color: #92400e;
      margin-bottom: 6px;
    }
    .upi-coming-msg {
      font-size: 0.85rem;
      color: #a16207;
      line-height: 1.55;
      margin-bottom: 14px;
    }
    .upi-switch-btn {
      background: linear-gradient(135deg, #16a34a, #22c55e);
      color: #fff;
      border: none;
      border-radius: 30px;
      padding: 10px 22px;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(22,163,74,0.35);
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
    /* Action footer — fixed above bottom nav (68px) on both steps */
    .action-footer {
      position: fixed;
      left: 0; right: 0;
      bottom: calc(68px + env(safe-area-inset-bottom, 0px));
      background: #fff;
      padding: 8px 12px;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.08);
      z-index: 990;
    }
    /* Remove the old ion-footer margin hack */
    ion-footer { margin-bottom: 0; }
    .proceed-btn {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 993;
    }
    .addr-picker-sheet {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: #fff; border-radius: 20px 20px 0 0;
      padding: 20px 16px 40px; z-index: 994;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.15);
      max-height: 80vh; overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    /* ===== VILLAGE / LANDMARK PROMPT (top-anchored so keyboard can't cover it) ===== */
    .loc-prompt-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 993;
    }
    .loc-prompt-card {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: calc(100% - 32px);
      max-width: 420px;
      max-height: min(85vh, calc(100vh - 80px));
      background: #fff;
      border-radius: 20px;
      padding: 24px 20px 28px;
      z-index: 994;
      box-shadow: 0 8px 40px rgba(0,0,0,0.22);
      overflow-y: auto;
    }
    .loc-prompt-icon {
      text-align: center; font-size: 2.4rem; margin-bottom: 6px;
    }
    .loc-prompt-title {
      font-size: 1.05rem; font-weight: 800; color: #1a1a1a;
      text-align: center; margin-bottom: 4px;
    }
    .loc-prompt-hint {
      font-size: 0.82rem; color: #6f7f95; text-align: center;
      margin: 0 0 18px;
    }
    .loc-field { margin-bottom: 14px; }
    .loc-label {
      display: block; font-size: 0.78rem; font-weight: 700;
      color: #4a5568; margin-bottom: 6px;
    }
    .loc-req { color: #d32f2f; }
    .loc-input {
      width: 100%; border: 2px solid #dbe4f0; border-radius: 12px;
      padding: 12px 14px; font-size: 0.95rem; outline: none;
      box-sizing: border-box; background: #f8fbff;
      transition: border-color 0.2s;
    }
    .loc-input:focus { border-color: #667eea; background: #fff; }
    .loc-error {
      color: #d32f2f; font-size: 0.82rem; font-weight: 600;
      margin: -6px 0 10px; text-align: center;
    }
    .loc-save-btn {
      display: block; width: 100%; margin-top: 6px;
      padding: 14px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff; border: none; border-radius: 14px;
      font-size: 0.95rem; font-weight: 700; cursor: pointer;
      box-shadow: 0 4px 14px rgba(102,126,234,0.35);
    }
    .loc-save-btn:disabled { opacity: 0.65; }
    .addr-picker-title {
      font-weight: 800; font-size: 1rem; color: #1a1a1a; margin-bottom: 14px; text-align: center;
    }
    .addr-meta-hint {
      margin: -2px 0 12px;
      color: #666;
      font-size: 0.84rem;
      text-align: center;
    }
    .meta-field { margin-bottom: 10px; }
    .meta-field label {
      display: block;
      font-size: 0.78rem;
      color: #6f7f95;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .meta-input {
      width: 100%;
      border: 1.5px solid #dbe4f0;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 0.9rem;
      outline: none;
      box-sizing: border-box;
      background: #f8fbff;
    }
    .meta-input:focus {
      border-color: #667eea;
      background: #fff;
    }
    .addr-meta-error {
      margin: 2px 0 8px;
      color: #d32f2f;
      font-size: 0.82rem;
      font-weight: 600;
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
      padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff;
      border: none; border-radius: 14px; font-size: 1rem; font-weight: 700; cursor: pointer;
    }

    /* ═══════════════════════════════════════════════════════════
       RESPONSIVE DESIGN FOR ALL PHONE SIZES
    ═══════════════════════════════════════════════════════════ */
    @media (max-width: 360px) {
      .addr-picker-sheet {
        padding: 16px 12px 40px;
        max-height: 75vh;
        border-radius: 16px 16px 0 0;
      }
      .loc-prompt-card {
        width: calc(100% - 24px);
        max-width: 360px;
        padding: 20px 16px 24px;
        border-radius: 16px;
      }
      .addr-item-label, .addr-item-line {
        font-size: 0.9rem;
      }
      .addr-picker-item {
        padding: 12px;
      }
      .loc-prompt-title {
        font-size: 1rem;
      }
      .loc-field label, .loc-input, .loc-save-btn {
        font-size: 0.9rem;
      }
      .loc-input {
        padding: 10px;
        border-radius: 8px;
      }
      .loc-save-btn {
        padding: 10px;
        min-height: 44px;
      }
    }

    @media (max-width: 280px) {
      .addr-picker-sheet {
        padding: 12px 10px 40px;
        max-height: 70vh;
        border-radius: 14px 14px 0 0;
      }
      .loc-prompt-card {
        width: calc(100% - 20px);
        max-width: 280px;
        padding: 16px 12px 20px;
        border-radius: 12px;
      }
      .addr-item-label, .addr-item-line {
        font-size: 0.8rem;
      }
      .addr-item-icon {
        font-size: 1.5rem;
      }
      .addr-picker-item {
        padding: 10px;
        gap: 10px;
      }
      .loc-prompt-icon {
        font-size: 2rem;
      }
      .loc-prompt-title {
        font-size: 0.9rem;
      }
      .loc-prompt-hint {
        font-size: 0.8rem;
      }
      .loc-field label {
        font-size: 0.8rem;
      }
      .loc-input {
        padding: 8px;
        font-size: 0.85rem;
        border-radius: 6px;
      }
      .loc-save-btn {
        padding: 8px;
        font-size: 0.85rem;
        min-height: 40px;
      }
      .addr-picker-close {
        padding: 10px;
        font-size: 0.9rem;
        min-height: 44px;
      }
    }

    /* Add New Address Button */
    .addr-add-new-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-bottom: 12px;
    }
    
    .addr-add-new-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 14px rgba(102, 126, 234, 0.3);
    }

    /* Address Form Modal Overlay */
    .addr-form-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
    }

    /* Address Form Modal */
    .addr-form-modal {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      border-radius: 20px 20px 0 0;
      padding: 20px;
      max-height: 90vh;
      overflow-y: auto;
      z-index: 1000;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .addr-form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid #f0f0f0;
      padding-bottom: 12px;
    }

    .addr-form-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #1a1a1a;
    }

    .addr-form-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Form Styling */
    .addr-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-weight: 600;
      font-size: 0.95rem;
      color: #1a1a1a;
    }

    .required {
      color: #ff6b6b;
      font-weight: 700;
    }

    .form-group input {
      padding: 12px;
      border: 1.5px solid #e0e0e0;
      border-radius: 10px;
      font-size: 0.95rem;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-group .error {
      color: #ff6b6b;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .addr-form-actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
    }

    .btn-cancel {
      flex: 1;
      padding: 12px;
      background: #f0f0f0;
      color: #333;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel:active {
      transform: scale(0.98);
      background: #e0e0e0;
    }

    .btn-save {
      flex: 1;
      padding: 12px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-save:active:not(:disabled) {
      transform: scale(0.98);
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    /* Ensure touch targets are always >= 44px */
    @media (max-width: 480px) {
      .loc-retry-btn, .addr-manual-btn, .addr-edit-btn, .addr-del-btn, .addr-add-new-btn {
        min-height: 44px;
        padding: 10px;
      }
      .cstep-btn {
        min-width: 40px;
        min-height: 40px;
      }
    }
  `]
})
export class CartPage implements OnInit, OnDestroy {
  checking = false;
  orderMsg = '';
  Math = Math;
  readonly checkoutStep = signal<'cart' | 'payment'>('cart');
  readonly paymentMode = signal<'UPI' | 'COD'>('COD');
  readonly confirmingCod = signal(false);
  readonly upiReference = signal('');
  readonly upiPaymentVerified = signal(false);
  readonly checkoutSuccess = signal(false);
  readonly lastPlacedAmount = signal(0);
  readonly lastPlacedOrderId = signal<number | null>(null);
  // Delivery fee from last checkout response (shown after order confirmation)
  readonly currentDeliveryFee = signal(0);
  readonly deliveryFee = computed(() => this.currentDeliveryFee());
  readonly deliveryFeeLabel = computed(() => {
    const charge = this.deliveryFee();
    return charge === 0 ? 'FREE 🎉' : `₹${Math.round(charge)}`;
  });
  readonly amountToFreeDelivery = computed(() => Math.max(0, 299 - this.cartState.subtotal()));
  readonly refetchingLoc = signal(false);
  readonly savedAddresses = signal<any[]>([]);
  readonly selectedAddressId = signal<any>('gps'); // 'gps' | address.id
  readonly selectedAddress = signal<any | null>(null); // null = use GPS
  readonly showAddressPicker = signal(false);
  readonly showAddNewAddressForm = signal(false);
  readonly showLocationDetailsPrompt = signal(false);
  readonly savingLocationDetails = signal(false);
  readonly locationDetailsError = signal('');
  private pendingProceedAfterDetails = false;
  checkoutVillage = '';
  checkoutLandmark = '';
  
  newAddressForm = {
    village: '',
    landmark: '',
    post: '',
    pincode: '',
    district: ''
  };

  readonly selectedAddressLabel = computed(() => {
    const addr = this.selectedAddress();
    if (addr) return `${addr.label ? addr.label + ': ' : ''}${this.formatAddress(addr)}`;
    
    // Show full address with Village → Landmark → Detected Location order
    const meta = this.getPersistedVillageAndLandmark();
    const detectedLocation = String(this.locationService.currentLocation()?.address || '').trim();
    const parts: string[] = [];
    
    if (meta.village) parts.push(`Village: ${meta.village}`);
    if (meta.landmark) parts.push(`Landmark: ${meta.landmark}`);
    if (detectedLocation) parts.push(detectedLocation);
    
    if (parts.length > 0) return parts.join(' | ');
    if (detectedLocation) return detectedLocation;
    if (this.locationService.isLocating()) return 'Detecting location…';
    return 'No address selected – tap Change';
  });

  readonly formattedDeliveryAddress = computed(() => {
    const meta = this.getPersistedVillageAndLandmark();
    const detectedLocation = String(this.locationService.currentLocation()?.address || '').trim();
    const parts: string[] = [];
    
    if (detectedLocation) parts.push(detectedLocation);
    if (meta.village) parts.push(`Village: ${meta.village}`);
    if (meta.landmark) parts.push(`Landmark: ${meta.landmark}`);
    
    return parts.length > 0 ? parts.join(' | ') : 'No address provided';
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
    public locationService: LocationService,
    public deliveryChargeService: DeliveryChargeService
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
          // Auto-select default address on first load or if no valid address selected
          const currentAddr = this.selectedAddress();
          if (!currentAddr || !currentAddr.id) {
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

  addNewAddressAndSelect() {
    // Validate mandatory fields
    if (!this.newAddressForm.village?.trim() || !this.newAddressForm.landmark?.trim() || !this.newAddressForm.post?.trim()) {
      alert('Please fill in all mandatory fields: Village, Landmark, and Post');
      return;
    }

    // Create address payload to save to backend database
    const payload = {
      label: `${this.newAddressForm.village.trim()} - ${this.newAddressForm.landmark.trim()}`,
      line1: this.newAddressForm.post.trim(),
      line2: this.newAddressForm.district?.trim() || '',
      city: this.newAddressForm.village.trim(),
      state: 'Uttar Pradesh', // Default state
      postalCode: this.newAddressForm.pincode?.trim() || '000000',
      village: this.newAddressForm.village.trim(),
      landmark: this.newAddressForm.landmark.trim(),
      isDefault: true
    };

    // Save address to backend database (persistent storage)
    this.api.post<any>('/customer/profile/addresses', payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (savedAddress) => {
          // Add to saved addresses list
          this.savedAddresses.set([savedAddress, ...this.savedAddresses()]);
          
          // Select this address
          this.selectedAddress.set(savedAddress);
          this.selectedAddressId.set(savedAddress.id);

          // Close both modals
          this.showAddNewAddressForm.set(false);
          this.showAddressPicker.set(false);

          // Reset form
          this.newAddressForm = {
            village: '',
            landmark: '',
            post: '',
            pincode: '',
            district: ''
          };
        },
        error: (err) => {
          console.error('Failed to save address:', err);
          alert('Failed to save address. Please try again.');
        }
      });
  }

  private gpsVillageKey = 'orderkro_gps_village';
  private gpsLandmarkKey = 'orderkro_gps_landmark';

  private getPersistedVillageAndLandmark(): { village: string; landmark: string } {
    const saved = this.selectedAddress();
    if (saved) {
      return {
        village: String(saved?.village || saved?.line2 || '').trim(),
        landmark: String(saved?.landmark || '').trim()
      };
    }
    return {
      village: String(localStorage.getItem(this.gpsVillageKey) || '').trim(),
      landmark: String(localStorage.getItem(this.gpsLandmarkKey) || '').trim()
    };
  }

  private needsVillageAndLandmark(): boolean {
    const meta = this.getPersistedVillageAndLandmark();
    return !meta.village || !meta.landmark;
  }

  private normalizeAddressPart(value: any): string {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  private appendAddressPart(parts: string[], seen: Set<string>, value: any, prefix = '') {
    const normalized = this.normalizeAddressPart(value);
    if (!normalized) {
      return;
    }

    const displayValue = prefix ? `${prefix}${normalized}` : normalized;
    const key = displayValue.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    parts.push(displayValue);
  }

  formatAddress(address: any): string {
    if (!address) {
      return '';
    }

    const parts: string[] = [];
    const seen = new Set<string>();

    this.appendAddressPart(parts, seen, address.village);
    this.appendAddressPart(parts, seen, address.landmark, 'Near By ');
    this.appendAddressPart(parts, seen, address.line1 || address.addressLine1);
    this.appendAddressPart(parts, seen, address.line2);
    this.appendAddressPart(parts, seen, address.city);
    this.appendAddressPart(parts, seen, address.state);
    this.appendAddressPart(parts, seen, address.postalCode);

    return parts.join(', ');
  }

  private async reverseGeocode(lat: number, lng: number): Promise<any> {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    const address = data.address || {};

    return {
      road: address.road || address.pedestrian || address.footway || address.path || '',
      suburb: address.suburb || address.neighbourhood || address.quarter || '',
      city: address.city || address.town || address.village || address.county || '',
      state: address.state || '',
      postcode: address.postcode || ''
    };
  }

  private openLocationDetailsPrompt() {
    const meta = this.getPersistedVillageAndLandmark();
    // Only overwrite if the fields aren't already partially filled by the user
    if (!this.checkoutVillage) this.checkoutVillage = meta.village;
    if (!this.checkoutLandmark) this.checkoutLandmark = meta.landmark;
    this.locationDetailsError.set('');
    this.showLocationDetailsPrompt.set(true);
  }

  cancelLocationDetailsPrompt() {
    this.pendingProceedAfterDetails = false;
    this.locationDetailsError.set('');
    this.showLocationDetailsPrompt.set(false);
  }

  saveLocationDetailsAndProceed() {
    const village = this.checkoutVillage.trim();
    const landmark = this.checkoutLandmark.trim();
    if (!village || !landmark) {
      this.locationDetailsError.set('Please enter both village and landmark.');
      return;
    }

    const selected = this.selectedAddress();
    if (!selected?.id) {
      // GPS path — save village/landmark to localStorage as fallback
      localStorage.setItem(this.gpsVillageKey, village);
      localStorage.setItem(this.gpsLandmarkKey, landmark);

      // Also create a real saved address on the backend so it appears in profile and "Deliver To"
      const gpsLoc = this.locationService.currentLocation();
      this.savingLocationDetails.set(true);
      Promise.resolve(
        gpsLoc?.latitude != null && gpsLoc?.longitude != null
          ? this.reverseGeocode(gpsLoc.latitude, gpsLoc.longitude)
          : Promise.resolve({ road: '', suburb: '', city: '', state: '', postcode: '' })
      )
        .then((structured) => {
          const addressPayload = {
            label: 'Home',
            line1: structured.road || structured.suburb || structured.city || village,
            line2: structured.suburb || '',
            city: structured.city || village,
            state: structured.state || 'Uttar Pradesh',
            postalCode: structured.postcode || '000000',
            village,
            landmark,
            latitude: gpsLoc?.latitude ?? null,
            longitude: gpsLoc?.longitude ?? null,
            isDefault: true
          };

          this.api.post<any>('/customer/profile/addresses', addressPayload)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (created) => {
                this.savingLocationDetails.set(false);
                this.selectedAddress.set(created);
                this.selectedAddressId.set(created?.id || 'gps');
                this.savedAddresses.set([created, ...this.savedAddresses().filter((a: any) => a.id !== created?.id)]);
                this.showLocationDetailsPrompt.set(false);
                if (this.pendingProceedAfterDetails) {
                  this.pendingProceedAfterDetails = false;
                  this.checkoutStep.set('payment');
                }
              },
              error: () => {
                this.savingLocationDetails.set(false);
                this.showLocationDetailsPrompt.set(false);
                if (this.pendingProceedAfterDetails) {
                  this.pendingProceedAfterDetails = false;
                  this.checkoutStep.set('payment');
                }
              }
            });
        })
        .catch(() => {
          this.savingLocationDetails.set(false);
          this.showLocationDetailsPrompt.set(false);
          if (this.pendingProceedAfterDetails) {
            this.pendingProceedAfterDetails = false;
            this.checkoutStep.set('payment');
          }
        });
      return;
    }

    this.savingLocationDetails.set(true);
    this.locationDetailsError.set('');
    const payload = {
      label: selected.label || 'Home',
      line1: selected.line1 || selected.addressLine1 || '',
      line2: selected.line2 || '',
      city: selected.city || '',
      state: selected.state || '',
      postalCode: selected.postalCode || '',
      village,
      landmark,
      latitude: selected.latitude ?? null,
      longitude: selected.longitude ?? null,
      isDefault: !!selected.isDefault
    };

    this.api.put<any>(`/customer/profile/addresses/${selected.id}`, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.savingLocationDetails.set(false);
          this.showLocationDetailsPrompt.set(false);
          const merged = { ...selected, ...updated, village, landmark };
          this.selectedAddress.set(merged);
          this.savedAddresses.set(this.savedAddresses().map((a: any) => a.id === selected.id ? merged : a));
          if (this.pendingProceedAfterDetails) {
            this.pendingProceedAfterDetails = false;
            this.checkoutStep.set('payment');
          }
        },
        error: (err) => {
          this.savingLocationDetails.set(false);
          this.locationDetailsError.set(this.getErrorMessage(err, 'Could not save village/landmark. Please try again.'));
        }
      });
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

    if (this.needsVillageAndLandmark()) {
      this.pendingProceedAfterDetails = true;
      this.openLocationDetailsPrompt();
      return;
    }

    // Load delivery charge only when user proceeds to payment (lazy load)
    this.deliveryChargeService.loadDeliveryCharge();
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
        notes: this.buildCheckoutNotes()
      };

      // Attach saved address ID so backend can build the full address string
      const saved = this.selectedAddress();
      if (saved?.id) {
        checkoutData.addressId = saved.id;
      }

      if (this.paymentMode() === 'UPI') {
        checkoutData.upiReference = this.upiReference() || 'RAZORPAY_UPI';
      }

      // Use selected address coords, or fall back to GPS
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
          // Capture the current delivery fee from response (ALWAYS up-to-date from backend)
          const deliveryFeeFromResponse = response?.deliveryFee || 0;
          this.currentDeliveryFee.set(Number(deliveryFeeFromResponse));
          
          const placedAmount = this.cartState.subtotal() + Number(deliveryFeeFromResponse);
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

  private buildCheckoutNotes(): string {
    const meta = this.getPersistedVillageAndLandmark();
    const parts = ['Deliver fast'];
    const detectedLocation = String(this.locationService.currentLocation()?.address || '').trim();
    if (this.selectedAddressId() === 'gps' && detectedLocation) {
      parts.push(`Detected Location: ${detectedLocation}`);
    }
    if (meta.village) parts.push(`Village/Area: ${meta.village}`);
    if (meta.landmark) parts.push(`Landmark: ${meta.landmark}`);
    return parts.join(' | ');
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

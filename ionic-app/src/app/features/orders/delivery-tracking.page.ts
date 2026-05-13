import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonBackButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonSpinner, IonButton } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonTitle, IonToolbar, IonBackButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonSpinner, IonButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/orders"></ion-back-button>
        </ion-buttons>
        <ion-title>Track Delivery</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" style="--padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px))">

      <!-- Error loading order -->
      <div *ngIf="orderError()" class="state-box error-box">
        <p style="font-size:2rem;">⚠️</p>
        <p>Could not load order details.</p>
        <ion-button size="small" (click)="loadAll()">Retry</ion-button>
      </div>

      <!-- Loading: order not yet fetched -->
      <div *ngIf="!orderError() && !order()" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>Loading order...</p>
      </div>

      <ng-container *ngIf="order() && !orderError()">

        <!-- PENDING: no rider assigned yet -->
        <div *ngIf="order().status === 'PENDING'" class="state-box pending-box">
          <p class="state-icon">⏳</p>
          <p class="state-title">Order Received!</p>
          <p class="state-desc">Your order <strong>#{{ orderId }}</strong> is waiting for store confirmation. We'll update you once it's confirmed.</p>
          <div class="order-summary-row"><span>Amount</span><strong>₹{{ order().totalAmount }}</strong></div>
          <div class="order-summary-row"><span>Payment</span><strong>{{ order().paymentMode || 'N/A' }}</strong></div>
        </div>

        <!-- CANCELLED -->
        <div *ngIf="order().status === 'CANCELLED'" class="state-box cancelled-box">
          <p class="state-icon">❌</p>
          <p class="state-title">Order Cancelled</p>
          <p class="state-desc">Order <strong>#{{ orderId }}</strong> has been cancelled.</p>
        </div>

        <!-- Active / Delivered: show full timeline -->
        <ng-container *ngIf="order().status !== 'PENDING' && order().status !== 'CANCELLED'">

          <!-- Order Status Timeline -->
          <ion-card class="status-timeline">
            <ion-card-header>
              <ion-card-title>Order Status</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="timeline">
                <div class="timeline-item" [class.completed]="isStatusCompleted('CONFIRMED')">
                  <div class="timeline-dot">✓</div>
                  <div class="timeline-content">
                    <p class="timeline-label">Order Confirmed</p>
                    <p class="timeline-desc">Payment received</p>
                  </div>
                </div>

                <div class="timeline-line" [class.active]="isStatusCompleted('CONFIRMED')"></div>

                <div class="timeline-item" [class.completed]="isStatusCompleted('PREPARING') || isStatusCompleted('OUT_FOR_DELIVERY') || isStatusCompleted('DELIVERED')" [class.active]="isStatusActive('PREPARING')">
                  <div class="timeline-dot">📦</div>
                  <div class="timeline-content">
                    <p class="timeline-label">Preparing Order</p>
                    <p class="timeline-desc">Picking items from warehouse</p>
                  </div>
                </div>

                <div class="timeline-line" [class.active]="isStatusCompleted('PREPARING')"></div>

                <div class="timeline-item" [class.completed]="isStatusCompleted('OUT_FOR_DELIVERY') || isStatusCompleted('DELIVERED')" [class.active]="isStatusActive('OUT_FOR_DELIVERY')">
                  <div class="timeline-dot">🚚</div>
                  <div class="timeline-content">
                    <p class="timeline-label">Out for Delivery</p>
                    <p class="timeline-desc">On the way to you</p>
                  </div>
                </div>

                <div class="timeline-line" [class.active]="isStatusCompleted('OUT_FOR_DELIVERY')"></div>

                <div class="timeline-item" [class.completed]="isStatusCompleted('DELIVERED')" [class.active]="isStatusActive('DELIVERED')">
                  <div class="timeline-dot">✓</div>
                  <div class="timeline-content">
                    <p class="timeline-label">Delivered</p>
                    <p class="timeline-desc">Order received</p>
                  </div>
                </div>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Delivery Boy Info (from tracking) -->
          <ion-card class="delivery-info" *ngIf="tracking()?.deliveryBoyName">
            <ion-card-header>
              <ion-card-title>Delivery Partner</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="delivery-boy">
                <div class="avatar">🚴</div>
                <div class="details">
                  <p class="name">{{ tracking().deliveryBoyName }}</p>
                  <p class="phone">📞 {{ tracking().deliveryBoyPhone }}</p>
                </div>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Current Status Badge -->
          <ion-card class="current-status">
            <ion-card-content>
              <p class="status-label">Current Status</p>
              <p [class]="'status-badge status-' + (order().status?.toLowerCase() || 'confirmed')">
                {{ order().status }}
              </p>
            </ion-card-content>
          </ion-card>

        </ng-container>
      </ng-container>

    </ion-content>
    <!-- Android system nav button safe area — same dark strip as home screen -->
    <div style="position:fixed;bottom:0;left:0;right:0;height:env(safe-area-inset-bottom,0px);background:#111;z-index:999;pointer-events:none;"></div>
  `,
  styles: [`
    ion-card {
      margin-top: 16px;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .timeline-item {
      display: flex;
      gap: 12px;
      opacity: 0.6;
      transition: opacity 0.3s;
    }

    .timeline-item.completed,
    .timeline-item.active {
      opacity: 1;
    }

    .timeline-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e8e8e8;
      border: 2px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
      transition: all 0.3s;
    }

    .timeline-item.completed .timeline-dot {
      background: #4caf50;
      border-color: #45a049;
      color: white;
    }

    .timeline-item.active .timeline-dot {
      background: #2196f3;
      border-color: #1976d2;
      box-shadow: 0 0 12px rgba(33, 150, 243, 0.4);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .timeline-content {
      flex: 1;
      padding-top: 4px;
    }

    .timeline-label {
      margin: 0;
      font-weight: 600;
      color: #333;
      font-size: 0.95rem;
    }

    .timeline-item.completed .timeline-label {
      color: #4caf50;
    }

    .timeline-item.active .timeline-label {
      color: #2196f3;
    }

    .timeline-desc {
      margin: 4px 0 0;
      color: #999;
      font-size: 0.85rem;
    }

    .timeline-line {
      width: 2px;
      height: 24px;
      background: #ddd;
      margin-left: 15px;
      transition: background 0.3s;
    }

    .timeline-line.active {
      background: #4caf50;
    }

    .delivery-info {
      margin-top: 12px;
    }

    .delivery-boy {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #e3f2fd;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }

    .details {
      flex: 1;
    }

    .name {
      margin: 0;
      font-weight: 600;
      color: #333;
    }

    .phone {
      margin: 4px 0 0;
      color: #666;
      font-size: 0.9rem;
    }

    .current-status {
      margin-top: 12px;
      text-align: center;
    }

    .status-label {
      margin: 0 0 8px;
      color: #666;
      font-size: 0.9rem;
    }

    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 700;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-confirmed {
      background-color: #d4edda;
      color: #155724;
    }

    .status-preparing {
      background-color: #fff3cd;
      color: #856404;
    }

    .status-out_for_delivery {
      background-color: #cfe2ff;
      color: #084298;
    }

    .status-delivered {
      background-color: #d1ecf1;
      color: #0c5460;
    }

    .status-pending {
      background-color: #f8f9fa;
      color: #6c757d;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      gap: 16px;
      color: #999;
    }

    /* State boxes for PENDING / CANCELLED / ERROR */
    .state-box {
      border-radius: 16px;
      padding: 32px 20px;
      text-align: center;
      margin-top: 24px;
    }
    .state-icon { font-size: 3rem; margin: 0 0 8px; }
    .state-title { font-size: 1.2rem; font-weight: 700; margin: 0 0 8px; color: #222; }
    .state-desc { font-size: 0.9rem; color: #666; margin: 0 0 20px; line-height: 1.5; }

    .pending-box { background: #fffbea; border: 1px solid #ffe082; }
    .cancelled-box { background: #fff0f0; border: 1px solid #ffcdd2; }
    .error-box { background: #fff0f0; border: 1px solid #ffcdd2; }

    .order-summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(255,255,255,0.7);
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 0.9rem;
      color: #555;
    }
  `]
})
export class DeliveryTrackingPage implements OnInit, OnDestroy {
  readonly tracking = signal<any>(null);
  readonly order = signal<any>(null);
  readonly trackingError = signal<boolean>(false);
  readonly orderError = signal<boolean>(false);
  private destroy$ = new Subject<void>();
  orderId: number = 0;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.orderId = Number(this.route.snapshot.paramMap.get('orderId'));
    this.loadAll();

    // Auto-refresh every 10 seconds
    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadAll());
  }

  loadAll(): void {
    // Always load order details first — works even for PENDING orders
    this.api.get<any>(`/customer/orders/${this.orderId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          this.order.set(order);
          // Only attempt tracking if order has progressed past PENDING
          if (order?.status && order.status !== 'PENDING') {
            this.loadTracking();
          } else {
            // PENDING: no tracking record yet — mark loading done
            this.trackingError.set(false);
          }
        },
        error: () => {
          this.orderError.set(true);
        }
      });
  }

  loadTracking(): void {
    this.api.get<any>(`/customer/orders/${this.orderId}/tracking`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.tracking.set(res.data ?? res);
          this.trackingError.set(false);
        },
        error: () => {
          // Tracking record doesn't exist yet — not an error we show harshly
          this.trackingError.set(true);
        }
      });
  }

  isStatusCompleted(status: string): boolean {
    const orderStatus = this.tracking()?.orderStatus ?? this.order()?.status;
    const statusOrder = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    return statusOrder.indexOf(orderStatus) >= statusOrder.indexOf(status);
  }

  isStatusActive(status: string): boolean {
    const orderStatus = this.tracking()?.orderStatus ?? this.order()?.status;
    return orderStatus === status;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

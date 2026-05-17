import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonButton, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonButton, IonRefresher, IonRefresherContent, BottomNavComponent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>My Orders</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [scrollEvents]="true" [fullscreen]="false" class="ion-padding" style="--padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px))">
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Loading -->
      <div *ngIf="loading()" style="text-align:center;margin-top:60px;">
        <p>Loading orders...</p>
      </div>

      <!-- Error -->
      <div *ngIf="!loading() && errorMsg()" style="background:#fff0f0;border:1px solid #ffcdd2;border-radius:12px;padding:16px;margin-bottom:12px;text-align:center;">
        <p style="color:#c62828;margin:0 0 10px;">⚠️ {{ errorMsg() }}</p>
        <ion-button size="small" (click)="loadOrders()">Retry</ion-button>
      </div>
      
      <ion-list *ngIf="!loading() && !errorMsg() && orders().length > 0; else noOrders">
        <div class="order-card" *ngFor="let o of orders()" [routerLink]="['/delivery-tracking', o.id]">
          <div class="order-card-top">
            <span [class]="'status-badge status-' + (o.status?.toLowerCase() || 'pending')">{{ o.status || 'PENDING' }}</span>
            <span class="order-id">#{{ o.id }}</span>
          </div>
          <div class="order-card-body">
            <span class="order-amount">₹{{ o.totalAmount }}</span>
            <span class="order-payment">{{ o.paymentMode || 'N/A' }}</span>
          </div>
          <p class="order-date" *ngIf="o.createdAt">🕐 {{ formatDate(o.createdAt) }}</p>
        </div>
      </ion-list>

      <ng-template #noOrders>
        <div *ngIf="!loading() && !errorMsg()" style="text-align:center;margin-top:60px;">
          <p style="font-size:2.5rem;">📦</p>
          <p>No orders yet</p>
          <ion-button routerLink="/products">Start Shopping</ion-button>
        </div>
      </ng-template>

      <!-- Status legend at bottom -->
      <div class="status-info" *ngIf="!loading() && orders().length > 0">
        <p class="status-info-title">Order Status Guide</p>
        <div class="status-info-row"><span class="status-badge status-pending">PENDING</span><span>Waiting to be confirmed</span></div>
        <div class="status-info-row"><span class="status-badge status-confirmed">CONFIRMED</span><span>Payment received, being prepared</span></div>
        <div class="status-info-row"><span class="status-badge status-delivered">DELIVERED</span><span>Order delivered successfully</span></div>
        <div class="status-info-row"><span class="status-badge status-cancelled">CANCELLED</span><span>Order was cancelled</span></div>
      </div>
    </ion-content>
    <app-bottom-nav></app-bottom-nav>
  `,
  styles: [`
    /* ── Order cards ── */
    .order-card {
      background: #fff;
      border-radius: 14px;
      padding: 14px 16px;
      margin-bottom: 12px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.08);
      border: 1px solid #f0f0f0;
      cursor: pointer;
      transition: box-shadow 0.15s;
    }
    .order-card:active { box-shadow: 0 2px 12px rgba(0,0,0,0.14); }

    .order-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .order-id {
      font-size: 0.82rem;
      color: #999;
      font-weight: 500;
    }

    .order-card-body {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .order-amount {
      font-size: 1.05rem;
      font-weight: 700;
      color: #1a1a1a;
    }

    .order-payment {
      font-size: 0.78rem;
      color: #777;
      background: #f5f5f5;
      padding: 2px 8px;
      border-radius: 20px;
    }

    .order-date {
      font-size: 0.78rem;
      color: #aaa;
      margin: 0;
    }

    /* ── Status badge ── */
    .status-badge {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .status-pending  { background: #fff3cd; color: #856404; }
    .status-confirmed { background: #d4edda; color: #155724; }
    .status-delivered { background: #cfe2ff; color: #084298; }
    .status-cancelled { background: #f8d7da; color: #721c24; }

    /* ── Status legend at bottom ── */
    .status-info {
      background: #fafafa;
      border: 1px solid #eee;
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 8px;
      margin-bottom: 16px;
    }

    .status-info-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 10px;
    }

    .status-info-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
      font-size: 0.82rem;
      color: #555;
    }
    .status-info-row:last-child { margin-bottom: 0; }
  `]
})
export class OrdersPage implements OnInit, OnDestroy {
  readonly orders = signal<any[]>([]);
  readonly loading = signal(true);
  readonly errorMsg = signal('');
  private destroy$ = new Subject<void>();
  private pollStop$ = new Subject<void>();

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  ionViewWillEnter(): void {
    this.loadOrders();
    // Poll every 30 seconds while page is active
    this.pollStop$ = new Subject<void>();
    interval(30000)
      .pipe(
        takeUntil(this.pollStop$),
        takeUntil(this.destroy$),
        switchMap(() => this.api.get<any>('/customer/orders'))
      )
      .subscribe({
        next: (res) => this.orders.set(Array.isArray(res) ? res : (res as any).content || []),
        error: () => {} // silent on background poll
      });
  }

  ionViewWillLeave(): void {
    this.pollStop$.next();
    this.pollStop$.complete();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.api.get<any>('/customer/orders')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.orders.set(Array.isArray(res) ? res : (res as any).content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.error?.message || err?.message || 'Failed to load orders';
          const status = err?.status;
          if (status === 401 || status === 403) {
            this.errorMsg.set('Session expired. Please log out and log in again.');
          } else {
            this.errorMsg.set(msg);
          }
        }
      });
  }

  onRefresh(event: any): void {
    this.api.get<any>('/customer/orders')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.orders.set(Array.isArray(res) ? res : (res as any).content || []);
          event.detail.complete();
        },
        error: () => event.detail.complete()
      });
  }

  formatDate(dateString: string): string {
    try {
      const normalized = dateString && !dateString.endsWith('Z') && !dateString.includes('+') ? dateString + 'Z' : dateString;
      const date = new Date(normalized);
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return dateString;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

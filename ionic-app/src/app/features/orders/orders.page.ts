import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButton, IonIcon, IonRefresher, IonRefresherContent, IonButtons, IonBackButton } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButton, IonIcon, IonRefresher, IonRefresherContent, IonButtons, IonBackButton, BottomNavComponent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home" text="Back"></ion-back-button>
        </ion-buttons>
        <ion-title>My Orders</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [scrollEvents]="true" [fullscreen]="false" class="ion-padding" style="--padding-bottom: 72px;">
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
      
      <div class="status-info">
        <p><span class="status-badge status-pending">PENDING</span> Order confirmed, waiting for delivery</p>
        <p><span class="status-badge status-confirmed">CONFIRMED</span> Payment received, order confirmed</p>
        <p><span class="status-badge status-delivered">DELIVERED</span> Order delivered successfully</p>
      </div>
      
      <ion-list *ngIf="!loading() && !errorMsg() && orders().length > 0; else noOrders">
        <ion-item *ngFor="let o of orders()" [routerLink]="['/delivery-tracking', o.id]" detail>
          <ion-label>
            <h2>#{{ o.id }} <span [class]="'status-badge status-' + (o.status?.toLowerCase() || 'pending')">{{ o.status || 'PENDING' }}</span></h2>
            <p>Rs {{ o.totalAmount }} • {{ o.paymentMode || 'N/A' }}</p>
            <p class="order-date" *ngIf="o.createdAt">{{ formatDate(o.createdAt) }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ng-template #noOrders>
        <div *ngIf="!loading() && !errorMsg()" style="text-align:center;margin-top:60px;">
          <p style="font-size:2.5rem;">📦</p>
          <p>No orders yet</p>
          <ion-button routerLink="/products">Start Shopping</ion-button>
        </div>
      </ng-template>
    </ion-content>
    <app-bottom-nav></app-bottom-nav>
  `,
  styles: [`
    .status-info {
      background: #f0f4ff;
      border: 1px solid #dae5ff;
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 16px;
      font-size: 0.85rem;
    }

    .status-info p {
      margin: 6px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      min-width: 80px;
      text-align: center;
    }

    .status-pending {
      background-color: #fff3cd;
      color: #856404;
    }

    .status-confirmed {
      background-color: #d4edda;
      color: #155724;
    }

    .status-delivered {
      background-color: #cfe2ff;
      color: #084298;
    }

    .status-cancelled {
      background-color: #f8d7da;
      color: #721c24;
    }

    .order-date {
      font-size: 0.85rem;
      color: #666;
      margin-top: 4px;
    }
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
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButton, IonIcon, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButton, IonIcon, IonRefresher, IonRefresherContent],
  template: `
    <ion-header><ion-toolbar><ion-title>My Orders</ion-title></ion-toolbar></ion-header>
    <ion-content [scrollEvents]="true" [fullscreen]="false" class="ion-padding">
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      
      <div class="status-info">
        <p><span class="status-badge status-pending">PENDING</span> Order confirmed, waiting for delivery</p>
        <p><span class="status-badge status-confirmed">CONFIRMED</span> Payment received, order confirmed</p>
        <p><span class="status-badge status-delivered">DELIVERED</span> Order delivered successfully</p>
      </div>
      
      <ion-list *ngIf="orders().length > 0; else noOrders">
        <ion-item *ngFor="let o of orders()">
          <ion-label>
            <h2>#{{ o.id }} <span [class]="'status-badge status-' + (o.status?.toLowerCase() || 'pending')">{{ o.status || 'PENDING' }}</span></h2>
            <p>Rs {{ o.totalAmount }} • {{ o.paymentMode || 'N/A' }}</p>
            <p class="order-date" *ngIf="o.createdAt">{{ formatDate(o.createdAt) }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ng-template #noOrders>
        <div style="text-align:center;margin-top:60px;">
          <p style="font-size:2.5rem;">📦</p>
          <p>No orders yet</p>
          <ion-button routerLink="/products">Start Shopping</ion-button>
        </div>
      </ng-template>
    </ion-content>
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
  private destroy$ = new Subject<void>();

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  ionViewWillEnter(): void {
    // Refresh orders every time page is visited
    this.loadOrders();
  }

  loadOrders(): void {
    this.api.get<any>('/customer/orders')
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => this.orders.set(res.content || []));
  }

  onRefresh(event: any): void {
    this.api.get<any>('/customer/orders')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.orders.set(res.content || []);
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

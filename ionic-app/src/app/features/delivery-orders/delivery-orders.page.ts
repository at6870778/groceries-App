import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonButton, IonBadge, IonIcon, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonButton, IonBadge, IonIcon, IonRefresher, IonRefresherContent],
  template: `
    <ion-header>
      <ion-toolbar class="header-bar">
        <ion-title>Delivery Orders</ion-title>
        <div class="header-right">
          <span class="order-count">{{ orders().length }} Active</span>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content [scrollEvents]="true" [fullscreen]="false" class="ion-padding">
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content pullingIcon="chevron-down-circle-outline" pullingText="Pull to refresh" refreshingSpinner="circles" refreshingText="Refreshing..."></ion-refresher-content>
      </ion-refresher>

      <div *ngIf="errorMsg()" style="background:#fee;color:#c00;padding:12px;border-radius:8px;margin:12px;font-size:13px;">
        ⚠️ {{ errorMsg() }} — <span style="text-decoration:underline;cursor:pointer;" (click)="load()">Retry</span>
      </div>

      <div class="stats-bar">
        <div class="stat">
          <div class="stat-label">Total Earnings</div>
          <div class="stat-value">₹{{ calculateEarnings() }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Completed</div>
          <div class="stat-value">{{ countByStatus('DELIVERED') }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">In Progress</div>
          <div class="stat-value">{{ countByStatus('OUT_FOR_DELIVERY') }}</div>
        </div>
      </div>

      <div *ngIf="orders().length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h2>No Active Orders</h2>
        <p>You'll see assigned orders here</p>
      </div>

      <div class="orders-list" *ngIf="orders().length > 0">
        <div *ngFor="let order of orders()" class="order-card">
          <div class="card-header">
            <div class="order-id">Order #{{ order.id }}</div>
            <div [ngClass]="'status-badge status-' + (order.assignmentStatus || 'ASSIGNED').toLowerCase()">
              {{ getStatusLabel(order.assignmentStatus) }}
            </div>
          </div>

          <div class="order-details">
            <div class="detail-row">
              <span class="label">Customer</span>
              <span class="value">{{ order.customerName || 'N/A' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Phone</span>
              <span class="value">{{ order.customerPhone || 'N/A' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Items</span>
              <span class="value badge">{{ (order.items || []).length }} items</span>
            </div>
            <div class="detail-row">
              <span class="label">Amount</span>
              <span class="value amount">₹{{ order.totalAmount || 0 }}</span>
            </div>
            <div class="detail-row address">
              <span class="label">📍 Delivery To</span>
              <span class="value">{{ order.deliveryAddress || 'N/A' }}</span>
            </div>
          </div>

          <div class="status-flow">
            <div [ngClass]="'status-step ' + (isStatusReached(order, 'PICKED') ? 'done' : '')">
              <div class="step-dot">✓</div>
              <div class="step-label">Picked</div>
            </div>
            <div class="flow-line" [ngClass]="isStatusReached(order, 'OUT_FOR_DELIVERY') ? 'done' : ''"></div>
            <div [ngClass]="'status-step ' + (isStatusReached(order, 'OUT_FOR_DELIVERY') ? 'done' : '')">
              <div class="step-dot">🚴</div>
              <div class="step-label">Out</div>
            </div>
            <div class="flow-line" [ngClass]="isStatusReached(order, 'DELIVERED') ? 'done' : ''"></div>
            <div [ngClass]="'status-step ' + (isStatusReached(order, 'DELIVERED') ? 'done' : '')">
              <div class="step-dot">📦</div>
              <div class="step-label">Delivered</div>
            </div>
          </div>

          <div class="action-buttons">
            <button class="action-btn btn-primary" *ngIf="!isStatusReached(order, 'PICKED')" (click)="update(order, 'PICKED')">
              Mark as Picked
            </button>
            <button class="action-btn btn-secondary" *ngIf="isStatusReached(order, 'PICKED') && !isStatusReached(order, 'OUT_FOR_DELIVERY')" (click)="update(order, 'OUT_FOR_DELIVERY')">
              Start Delivery
            </button>
            <button class="action-btn btn-success" *ngIf="isStatusReached(order, 'OUT_FOR_DELIVERY') && !isStatusReached(order, 'DELIVERED')" (click)="update(order, 'DELIVERED')">
              Mark Delivered
            </button>
            <button class="action-btn btn-completed" *ngIf="isStatusReached(order, 'DELIVERED')" disabled>
              ✓ Completed
            </button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      --ion-background-color: #f8fafc;
    }

    ion-header {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --color: white;
      padding: 12px 16px;
    }

    ion-title {
      font-size: 20px;
      font-weight: 700;
    }

    .header-right {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .order-count {
      background: rgba(255, 255, 255, 0.2);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    ion-content {
      --background: #f8fafc;
    }

    .stats-bar {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      padding: 16px;
      background: white;
      margin: 16px;
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .stat {
      text-align: center;
      padding: 12px;
    }

    .stat-label {
      font-size: 11px;
      color: #6f7f95;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #667eea;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #8a99ad;
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .empty-state h2 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 8px;
      color: #3a4b63;
    }

    .empty-state p {
      font-size: 14px;
      color: #8a99ad;
    }

    .orders-list {
      padding: 16px;
    }

    .order-card {
      background: white;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border-left: 4px solid #667eea;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #ebeff6;
    }

    .order-id {
      font-size: 16px;
      font-weight: 700;
      color: #1a1a1a;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .status-badge.status-pending {
      background: #fff3e0;
      color: #f57c00;
    }

    .status-badge.status-assigned {
      background: #e3f2fd;
      color: #1565c0;
    }

    .status-badge.status-picked {
      background: #e8eaf6;
      color: #3f51b5;
    }

    .status-badge.status-out_for_delivery {
      background: #fff9c4;
      color: #f9a825;
    }

    .status-badge.status-delivered {
      background: #c8e6c9;
      color: #2e7d32;
    }

    .order-details {
      margin-bottom: 16px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 8px 0;
      font-size: 13px;
    }

    .detail-row.address {
      padding: 10px;
      background: #f7f9fc;
      border-radius: 8px;
      margin-top: 8px;
      flex-direction: column;
      gap: 6px;
    }

    .label {
      color: #6f7f95;
      font-weight: 600;
    }

    .value {
      color: #1a1a1a;
      font-weight: 500;
      text-align: right;
    }

    .value.badge {
      background: #667eea;
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
    }

    .value.amount {
      font-size: 16px;
      font-weight: 700;
      color: #667eea;
    }

    .status-flow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 20px 0;
      padding: 16px;
      background: #f7f9fc;
      border-radius: 10px;
    }

    .status-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      flex: 1;
    }

    .step-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e1e8f4;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 600;
      color: #8a99ad;
      transition: all 0.3s ease;
    }

    .status-step.done .step-dot {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .step-label {
      font-size: 11px;
      color: #6f7f95;
      text-align: center;
      font-weight: 600;
    }

    .flow-line {
      height: 2px;
      background: #e1e8f4;
      flex: 0 1 20px;
      margin: 0 4px;
      transition: background 0.3s ease;
    }

    .flow-line.done {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    }

    .action-buttons {
      display: flex;
      gap: 10px;
      margin-top: 16px;
    }

    .action-btn {
      flex: 1;
      padding: 12px 16px;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      letter-spacing: 0.3px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:active {
      transform: scale(0.98);
    }

    .btn-secondary {
      background: linear-gradient(135deg, #f9a825 0%, #f7931e 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(249, 168, 37, 0.3);
    }

    .btn-secondary:active {
      transform: scale(0.98);
    }

    .btn-success {
      background: linear-gradient(135deg, #26c281 0%, #2e8b57 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(38, 194, 129, 0.3);
    }

    .btn-success:active {
      transform: scale(0.98);
    }

    .btn-completed {
      background: #e8f5e9;
      color: #2e7d32;
      cursor: not-allowed;
      opacity: 0.6;
    }
  `]
})
export class DeliveryOrdersPage implements OnInit {
  readonly orders = signal<any[]>([]);
  readonly loading = signal(false);
  readonly errorMsg = signal('');

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set('');
    this.api.get<any[]>('/delivery/orders').subscribe({
      next: (res) => {
        this.orders.set(res || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || err?.message || 'Failed to load orders';
        this.errorMsg.set(msg);
      }
    });
  }

  onRefresh(event: any) {
    this.load();
    setTimeout(() => event.detail.complete(), 1000);
  }

  update(order: any, status: string) {
    const assignmentId = order.assignmentId || order.id;
    this.api.patch(`/delivery/assignments/${assignmentId}/status`, { status }).subscribe({
      next: () => this.load(),
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Update failed';
        this.errorMsg.set(msg);
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ASSIGNED': '📋 Assigned',
      'PICKED': '📦 Picked',
      'OUT_FOR_DELIVERY': '🚴 On the Way',
      'DELIVERED': '✓ Delivered',
      'CANCELLED': '❌ Cancelled'
    };
    return labels[status] || status || 'Assigned';
  }

  isStatusReached(order: any, targetAssignmentStatus: string): boolean {
    const progression = ['PICKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const current = order.assignmentStatus || '';
    const currentIndex = progression.indexOf(current);
    const targetIndex = progression.indexOf(targetAssignmentStatus);
    return currentIndex >= targetIndex && targetIndex >= 0;
  }

  countByStatus(status: string): number {
    return this.orders().filter(o => o.assignmentStatus === status).length;
  }

  calculateEarnings(): number {
    return this.orders()
      .filter(o => o.assignmentStatus === 'DELIVERED')
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  }
}

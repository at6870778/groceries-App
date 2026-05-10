import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { Router } from '@angular/router';

type DashboardCard = {
  label: string;
  value: number;
  route?: string;
  queryParams?: Record<string, string>;
};

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 class="page-title">Hyperlocal Pulse</h2>
    <section class="grid-cards">
      <article class="metric-card" *ngFor="let item of cards()" [class.clickable]="!!item.route" (click)="openCard(item)">
        <div style="color:#5f6b72">{{ item.label }}</div>
        <h3 style="margin:6px 0 0">{{ item.value }}</h3>
      </article>
    </section>

    <section class="metric-card" style="margin-top:14px;">
      <h3 style="margin-top:0;">Delivered Orders Trend (7 days)</h3>
      <div *ngIf="!dailyPoints().length" style="color:#5f6b72;">No delivered orders yet.</div>
      <div style="display:grid; gap:8px;" *ngIf="dailyPoints().length">
        <div *ngFor="let p of dailyPoints()" style="display:grid;grid-template-columns:70px 1fr 56px;gap:10px;align-items:center;">
          <small>{{ p.day.slice(5) }}</small>
          <div style="height:10px;background:#edf2ed;border-radius:999px;overflow:hidden;">
            <div [style.width.%]="p.percent" style="height:100%;background:linear-gradient(90deg,#0c7a43,#ff7a00);"></div>
          </div>
          <strong style="text-align:right;">{{ p.orderCount }}</strong>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .clickable {
      cursor: pointer;
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .clickable:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    }
  `]
})
export class DashboardComponent implements OnInit {
  readonly cards = signal<DashboardCard[]>([]);
  readonly dailyPoints = signal<Array<{ day: string; orderCount: number; percent: number }>>([]);

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.get<any>('/admin/dashboard').subscribe((data) => {
      this.cards.set([
        { label: 'Customers', value: data.totalCustomers, route: '/customers' },
        { label: 'Delivery Boys', value: data.totalDeliveryBoys, route: '/delivery-boys' },
        { label: 'Active Products', value: data.activeProducts, route: '/products' },
        { label: 'Pending Orders', value: data.pendingOrders, route: '/orders', queryParams: { status: 'PENDING' } },
        { label: 'Delivered Orders', value: data.deliveredOrders, route: '/orders', queryParams: { status: 'DELIVERED' } }
      ]);
    });

    this.api.get<any[]>('/admin/reports/daily', { days: 7 }).subscribe((points) => {
      const max = Math.max(...points.map((p) => p.orderCount), 1);
      this.dailyPoints.set(points.map((p) => ({
        day: p.day,
        orderCount: p.orderCount,
        percent: Math.round((p.orderCount / max) * 100)
      })));
    });
  }

  openCard(card: DashboardCard) {
    if (!card.route) {
      return;
    }
    this.router.navigate([card.route], { queryParams: card.queryParams });
  }
}

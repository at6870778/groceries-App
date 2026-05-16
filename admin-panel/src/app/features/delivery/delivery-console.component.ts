import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';

type DeliveryOrder = {
  id: number;
  assignmentId?: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  totalAmount: number;
  createdAt: string;
  deliveryBoyName: string;
  deliveryStatus: string;
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <h2 class="page-title">Deliver Console</h2>

    <div class="toolbar">
      <div class="meta">{{ filteredOrders().length }} / {{ assignedCount() }} assigned orders</div>
      <button class="refresh-btn" (click)="load()">Refresh</button>
    </div>

    <div class="filters">
      <input
        class="filter-input"
        type="text"
        [(ngModel)]="riderFilter"
        placeholder="Filter by rider name"
      />
      <select class="filter-select" [(ngModel)]="statusFilter">
        <option value="">All statuses</option>
        <option value="ASSIGNED">ASSIGNED</option>
        <option value="PICKED">PICKED</option>
        <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
        <option value="DELIVERED">DELIVERED</option>
      </select>
      <button class="clear-btn" (click)="clearFilters()">Clear</button>
    </div>

    <div *ngIf="errorMsg()" class="error-box">{{ errorMsg() }}</div>

    <div *ngIf="filteredOrders().length === 0 && !errorMsg()" class="empty-box">
      No delivery assignments found.
    </div>

    <div class="delivery-grid" *ngIf="filteredOrders().length > 0">
      <div class="delivery-card" *ngFor="let o of filteredOrders()">
        <div class="top-row">
          <strong>Order #{{ o.id }}</strong>
          <span class="status-chip">{{ o.deliveryStatus || 'ASSIGNED' }}</span>
        </div>

        <div class="row"><span>Rider</span><span>{{ o.deliveryBoyName || 'N/A' }}</span></div>
        <div class="row"><span>Customer</span><span>{{ o.customerName || 'N/A' }}</span></div>
        <div class="row"><span>Phone</span><span>{{ o.customerPhone || 'N/A' }}</span></div>
        <div class="row"><span>Amount</span><span>₹{{ o.totalAmount || 0 }}</span></div>
        <div class="address">📍 {{ o.deliveryAddress || 'N/A' }}</div>

        <div class="actions" *ngIf="o.assignmentId">
          <select class="status-select" [value]="selectedStatus()[o.assignmentId!] || o.deliveryStatus || 'ASSIGNED'"
            (change)="onSelectStatus(o.assignmentId!, $any($event.target).value)">
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="PICKED">PICKED</option>
            <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
            <option value="DELIVERED">DELIVERED</option>
          </select>
          <button class="update-btn" (click)="updateDeliveryStatus(o)">Update</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-title { margin-bottom: 14px; }
    .toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; }
    .meta { color:#5f6f86; font-size: 13px; font-weight: 600; }
    .refresh-btn { border:1px solid #c9d7eb; background:#fff; border-radius:8px; padding:6px 12px; font-weight:700; cursor:pointer; }
    .filters { display:grid; grid-template-columns: 1fr 200px 80px; gap:10px; margin-bottom: 12px; }
    .filter-input, .filter-select { border:1px solid #cfd9e8; border-radius:8px; padding:8px 10px; background:#fff; font-size:13px; }
    .clear-btn { border:1px solid #cfd9e8; border-radius:8px; background:#fff; font-weight:700; cursor:pointer; }
    .error-box { background:#f8d7da; color:#721c24; padding:10px 12px; border-radius:8px; margin-bottom:12px; }
    .empty-box { background:#fff; border:1px solid #e8edf5; border-radius:10px; padding:16px; color:#65758b; }
    .delivery-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:12px; }
    .delivery-card { background:#fff; border:1px solid #e8edf5; border-radius:12px; padding:12px; box-shadow:0 2px 8px rgba(0,0,0,0.04); }
    .top-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .status-chip { font-size:11px; font-weight:700; padding:3px 8px; border-radius:12px; background:#eef2ff; color:#3949ab; }
    .row { display:flex; justify-content:space-between; gap:10px; font-size:13px; margin:5px 0; }
    .row span:first-child { color:#6f7f95; }
    .row span:last-child { color:#1e2d40; font-weight:600; text-align:right; }
    .address { margin:8px 0 10px; font-size:13px; color:#394b62; }
    .actions { display:flex; gap:8px; }
    .status-select { flex:1; border:1px solid #cfd9e8; border-radius:8px; padding:7px 9px; background:#fff; }
    .update-btn { border:none; background:#2f7ff6; color:#fff; border-radius:8px; padding:7px 12px; font-weight:700; cursor:pointer; }
  `]
})
export class DeliveryConsoleComponent implements OnInit {
  readonly orders = signal<DeliveryOrder[]>([]);
  readonly errorMsg = signal('');
  readonly selectedStatus = signal<Record<number, string>>({});
  readonly assignedCount = computed(() => this.orders().length);
  readonly filteredOrders = computed(() => {
    const rider = this.riderFilter.trim().toLowerCase();
    const status = this.statusFilter.trim().toUpperCase();
    return this.orders().filter((o) => {
      const riderOk = !rider || String(o.deliveryBoyName || '').toLowerCase().includes(rider);
      const statusOk = !status || String(o.deliveryStatus || '').toUpperCase() === status;
      return riderOk && statusOk;
    });
  });
  riderFilter = '';
  statusFilter = '';

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.errorMsg.set('');
    this.api.get<any>('/admin/orders', { page: 0, size: 200 }).subscribe({
      next: (res) => {
        const payload = res?.data ?? res;
        const rows: DeliveryOrder[] = payload?.content || [];
        this.orders.set((rows || []).filter((r) => !!r.assignmentId));
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message || err?.message || 'Failed to load delivery assignments');
      }
    });
  }

  onSelectStatus(assignmentId: number, status: string) {
    this.selectedStatus.update((state) => ({ ...state, [assignmentId]: String(status || '').trim().toUpperCase() }));
  }

  clearFilters() {
    this.riderFilter = '';
    this.statusFilter = '';
  }

  updateDeliveryStatus(order: DeliveryOrder) {
    if (!order.assignmentId) return;
    const next = this.selectedStatus()[order.assignmentId] || order.deliveryStatus || 'ASSIGNED';
    this.api.patch(`/admin/delivery/assignments/${order.assignmentId}/status`, { status: next }).subscribe({
      next: () => {
        this.orders.update((rows) => rows.map((r) => r.assignmentId === order.assignmentId ? { ...r, deliveryStatus: next } : r));
        this.snack.open('Delivery status updated', '', { duration: 2000 });
      },
      error: (err) => {
        this.snack.open(err?.error?.message || 'Failed to update delivery status', '', { duration: 2800 });
      }
    });
  }
}

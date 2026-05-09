import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, MatSnackBarModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatTableModule],
  template: `
    <h2 class="page-title">Order Management</h2>
    <div style="display:flex;gap:16px;align-items:center;margin-bottom:12px;">
      <mat-form-field appearance="outline" style="width:200px;">
        <mat-select [value]="statusFilter()" (selectionChange)="onStatusFilter($event.value)">
          <mat-option value="">All Statuses</mat-option>
          <mat-option value="PENDING">PENDING</mat-option>
          <mat-option value="CONFIRMED">CONFIRMED</mat-option>
          <mat-option value="PREPARING">PREPARING</mat-option>
          <mat-option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</mat-option>
          <mat-option value="DELIVERED">DELIVERED</mat-option>
          <mat-option value="CANCELLED">CANCELLED</mat-option>
        </mat-select>
      </mat-form-field>
      <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
        <button mat-button (click)="prevPage()" [disabled]="currentPage() === 0">Previous</button>
        <span>Page {{ currentPage() + 1 }} / {{ totalPages() }}</span>
        <button mat-button (click)="nextPage()" [disabled]="currentPage() + 1 >= totalPages()">Next</button>
      </div>
    </div>
    <section class="metric-card" style="overflow:auto;">
      <table mat-table [dataSource]="orders()" style="width:100%;">
        <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>Order</th><td mat-cell *matCellDef="let o">#{{ o.id }}</td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let o">{{ o.status }}</td></ng-container>
        <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Amount</th><td mat-cell *matCellDef="let o">Rs {{ o.totalAmount }}</td></ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let o">
            <mat-form-field appearance="outline" style="width:170px;margin-right:8px;">
              <mat-select #statusSel [value]="o.status">
                <mat-option value="PENDING">PENDING</mat-option>
                <mat-option value="CONFIRMED">CONFIRMED</mat-option>
                <mat-option value="PREPARING">PREPARING</mat-option>
                <mat-option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</mat-option>
                <mat-option value="DELIVERED">DELIVERED</mat-option>
                <mat-option value="CANCELLED">CANCELLED</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-button (click)="updateStatus(o.id, statusSel.value)">Update</button>

            <mat-form-field appearance="outline" style="width:190px;margin-left:8px;margin-right:8px;">
              <mat-select #riderSel>
                <mat-option [value]="0">Assign Rider</mat-option>
                <mat-option *ngFor="let d of deliveryBoys()" [value]="d.id">{{ d.fullName }}</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-button color="primary" (click)="assign(o.id, riderSel.value)">Assign</button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </section>
  `
})
export class OrdersComponent implements OnInit {
  readonly orders = signal<any[]>([]);
  readonly deliveryBoys = signal<any[]>([]);
  readonly columns = ['id', 'status', 'amount', 'actions'];
  readonly currentPage = signal(0);
  readonly totalPages = signal(1);
  readonly statusFilter = signal('');

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.loadOrders();
    this.api.get<any>('/admin/delivery-boys', { page: 0, size: 100 }).subscribe((res) => this.deliveryBoys.set(res.content || []));
  }

  loadOrders(page = this.currentPage()) {
    const params: any = { page, size: 20 };
    const s = this.statusFilter();
    if (s) params.status = s;
    this.api.get<any>('/admin/orders', params).subscribe((res) => {
      this.orders.set(res.content || []);
      this.currentPage.set(res.number ?? page);
      this.totalPages.set(res.totalPages || 1);
    });
  }

  onStatusFilter(status: string) {
    this.statusFilter.set(status);
    this.loadOrders(0);
  }

  prevPage() {
    if (this.currentPage() === 0) return;
    this.loadOrders(this.currentPage() - 1);
  }

  nextPage() {
    if (this.currentPage() + 1 >= this.totalPages()) return;
    this.loadOrders(this.currentPage() + 1);
  }

  updateStatus(orderId: number, status: string) {
    this.api.patch(`/admin/orders/${orderId}/status`, { status }).subscribe(() => {
      this.loadOrders();
      this.snack.open('Order status updated', 'OK', { duration: 1600 });
    });
  }

  assign(orderId: number, deliveryBoyIdRaw: string) {
    const deliveryBoyId = Number(deliveryBoyIdRaw);
    if (!deliveryBoyId) return;
    this.api.post(`/admin/orders/${orderId}/assign`, { deliveryBoyId }).subscribe(() => {
      this.loadOrders();
      this.snack.open('Delivery boy assigned', 'OK', { duration: 1600 });
    });
  }
}

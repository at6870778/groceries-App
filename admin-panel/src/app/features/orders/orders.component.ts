import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatOptionModule } from '@angular/material/core';
import { ApiService } from '../../core/services/api.service';

interface OrderItem {
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface AdminOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  status: string;
  paymentMode: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  notes: string;
  createdAt: string;
  assignmentId?: number;
  deliveryBoyName: string;
  deliveryStatus: string;
  items: OrderItem[];
}

@Component({
  standalone: true,
  imports: [CommonModule, MatSnackBarModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatTableModule, MatExpansionModule, MatOptionModule],
  template: `
    <h2 class="page-title">Order Management</h2>
    <div style="display:flex;gap:16px;align-items:center;margin-bottom:12px;">
      <mat-form-field appearance="outline" style="width:200px;">
        <mat-label>Filter by Status</mat-label>
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
      <mat-accordion>
        <mat-expansion-panel *ngFor="let order of orders()" [expanded]="false">
          <mat-expansion-panel-header>
            <div style="display:flex;align-items:center;gap:16px;width:100%;">
              <strong style="min-width:80px;">Order #{{ order.id }}</strong>
              <span style="min-width:120px;">{{ order.customerName }} ({{ order.customerPhone }})</span>
              <span [ngClass]="'status-badge status-' + order.status.toLowerCase()">{{ order.status }}</span>
              <span style="margin-left:auto;">₹{{ order.totalAmount.toFixed(2) }}</span>
            </div>
          </mat-expansion-panel-header>
          
          <div style="padding:16px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
              <div>
                <strong>Customer Details</strong>
                <p style="margin:4px 0;">Phone: {{ order.customerPhone }}</p>
                <p style="margin:4px 0;">Address: {{ order.deliveryAddress }}</p>
              </div>
              <div>
                <strong>Order Details</strong>
                <p style="margin:4px 0;">Date: {{ order.createdAt | date:'short' }}</p>
                <p style="margin:4px 0;">Payment: {{ order.paymentMode }}</p>
                <p style="margin:4px 0;">Delivery Boy: <strong>{{ order.deliveryBoyName }}</strong></p>
                <p style="margin:4px 0;">Delivery Status: <span [ngClass]="'delivery-badge delivery-' + order.deliveryStatus.toLowerCase()">{{ order.deliveryStatus }}</span></p>
              </div>
            </div>

            <div style="margin-bottom:16px;">
              <strong>Items Ordered:</strong>
              <table style="width:100%;margin-top:8px;border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:1px solid #ddd;">
                    <th style="text-align:left;padding:8px;">Product</th>
                    <th style="text-align:center;padding:8px;">Qty</th>
                    <th style="text-align:right;padding:8px;">Unit Price</th>
                    <th style="text-align:right;padding:8px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of order.items" style="border-bottom:1px solid #eee;">
                    <td style="text-align:left;padding:8px;">{{ item.productName }} ({{ item.unit }})</td>
                    <td style="text-align:center;padding:8px;">{{ item.quantity }}</td>
                    <td style="text-align:right;padding:8px;">₹{{ item.unitPrice.toFixed(2) }}</td>
                    <td style="text-align:right;padding:8px;">₹{{ item.lineTotal.toFixed(2) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;padding-top:12px;border-top:1px solid #eee;">
              <div>
                <p style="margin:4px 0;">Subtotal: ₹{{ order.subtotal.toFixed(2) }}</p>
                <p style="margin:4px 0;">Delivery Fee: ₹{{ order.deliveryFee.toFixed(2) }}</p>
                <strong style="font-size:1.1em;">Total: ₹{{ order.totalAmount.toFixed(2) }}</strong>
              </div>
              <div *ngIf="order.notes">
                <strong>Notes:</strong>
                <p style="margin:4px 0;">{{ order.notes }}</p>
              </div>
            </div>

            <div style="display:flex;gap:8px;margin-top:16px;">
              <mat-form-field appearance="outline" style="flex:1;">
                <mat-select #statusSel [value]="order.status">
                  <mat-option value="PENDING">PENDING</mat-option>
                  <mat-option value="CONFIRMED">CONFIRMED</mat-option>
                  <mat-option value="PREPARING">PREPARING</mat-option>
                  <mat-option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</mat-option>
                  <mat-option value="DELIVERED">DELIVERED</mat-option>
                  <mat-option value="CANCELLED">CANCELLED</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-button color="primary" (click)="updateStatus(order.id, statusSel.value)">Update Order Status</button>
            </div>

            <div *ngIf="order.assignmentId" style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #eee;">
              <mat-form-field appearance="outline" style="flex:1;">
                <mat-label>Delivery Progress</mat-label>
                <mat-select #deliverySel [value]="order.deliveryStatus">
                  <mat-option value="ASSIGNED">ASSIGNED (Rider Assigned)</mat-option>
                  <mat-option value="PICKED">PICKED (Items Packed)</mat-option>
                  <mat-option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY (On the Way)</mat-option>
                  <mat-option value="DELIVERED">DELIVERED (Completed)</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-button color="accent" (click)="updateDeliveryStatus(order.assignmentId, deliverySel.value)">Update Delivery</button>
            </div>

            <div *ngIf="!order.assignmentId" style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #eee;">
              <mat-form-field appearance="outline" style="flex:1;">
                <mat-select #riderSel>
                  <mat-option [value]="0">Select Delivery Boy</mat-option>
                  <mat-option *ngFor="let d of deliveryBoys()" [value]="d.id">{{ d.fullName }}</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-button color="primary" (click)="assign(order.id, riderSel.value)">Assign Rider</button>
            </div>
          </div>
        </mat-expansion-panel>
      </mat-accordion>
    </section>
  `,
  styles: [`
    .status-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: bold;
      color: white;
    }
    .status-pending { background-color: #ffc107; }
    .status-confirmed { background-color: #28a745; }
    .status-preparing { background-color: #17a2b8; }
    .status-out_for_delivery { background-color: #007bff; }
    .status-delivered { background-color: #6c757d; }
    .status-cancelled { background-color: #dc3545; }
    
    .delivery-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: bold;
      color: white;
    }
    .delivery-not_assigned { background-color: #6c757d; }
    .delivery-assigned { background-color: #ffc107; }
    .delivery-picked { background-color: #17a2b8; }
    .delivery-out_for_delivery { background-color: #007bff; }
    .delivery-delivered { background-color: #28a745; }
  `]
})
export class OrdersComponent implements OnInit {
  readonly orders = signal<AdminOrder[]>([]);
  readonly deliveryBoys = signal<any[]>([]);
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

  updateDeliveryStatus(assignmentId: number, status: string) {
    this.api.patch(`/admin/delivery/assignments/${assignmentId}/status`, { status }).subscribe(() => {
      this.loadOrders();
      this.snack.open('Delivery status updated', 'OK', { duration: 1600 });
    });
  }
}


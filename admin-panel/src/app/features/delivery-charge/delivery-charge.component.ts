import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface DeliveryCharge {
  id?: number;
  chargeAmount: number;
  description?: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-delivery-charge',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="delivery-charge-container">
      <div class="page-header">
        <h1>🚗 Delivery Charge Management</h1>
        <p>Set and manage delivery charges</p>
      </div>

      <!-- Current Charge Card -->
      <div class="card current-charge-card">
        <div class="charge-display">
          <div class="charge-label">Current Delivery Charge</div>
          <div class="charge-amount">₹{{ currentCharge.chargeAmount }}</div>
          <div class="charge-desc">{{ currentCharge.description }}</div>
          <div class="charge-status" [class.active]="currentCharge.isActive">
            {{ currentCharge.isActive ? '✓ Active' : '✗ Inactive' }}
          </div>
        </div>
      </div>

      <!-- Update Charge Form -->
      <div class="card update-charge-card">
        <h2>Update Delivery Charge</h2>
        <form [formGroup]="chargeForm" (ngSubmit)="submitUpdate()" class="charge-form">
          <div class="form-group">
            <label>Delivery Charge Amount (₹) *</label>
            <div class="input-group">
              <span class="currency">₹</span>
              <input type="number" formControlName="chargeAmount" placeholder="0" min="0" step="0.01" class="form-control">
            </div>
            <small>Set charge in rupees (e.g., 0, 10, 20, 50, 100)</small>
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea formControlName="description" placeholder="e.g., Free delivery for orders above ₹500" class="form-control" rows="2"></textarea>
            <small>Optional note about this charge</small>
          </div>

          <button type="submit" [disabled]="!chargeForm.valid || isLoading" class="btn btn-primary">
            {{ isLoading ? 'Updating...' : '💾 Update Charge' }}
          </button>
        </form>
      </div>

      <!-- Quick Set Buttons -->
      <div class="card quick-set-card">
        <h2>Quick Set</h2>
        <div class="quick-buttons">
          <button (click)="setQuickCharge(0)" [class.active]="currentCharge.chargeAmount === 0" class="quick-btn">
            Free<br><span class="amount">₹0</span>
          </button>
          <button (click)="setQuickCharge(10)" [class.active]="currentCharge.chargeAmount === 10" class="quick-btn">
            Budget<br><span class="amount">₹10</span>
          </button>
          <button (click)="setQuickCharge(20)" [class.active]="currentCharge.chargeAmount === 20" class="quick-btn">
            Standard<br><span class="amount">₹20</span>
          </button>
          <button (click)="setQuickCharge(30)" [class.active]="currentCharge.chargeAmount === 30" class="quick-btn">
            Premium<br><span class="amount">₹30</span>
          </button>
          <button (click)="setQuickCharge(50)" [class.active]="currentCharge.chargeAmount === 50" class="quick-btn">
            Express<br><span class="amount">₹50</span>
          </button>
        </div>
      </div>

      <!-- History -->
      <div class="card history-card" *ngIf="history.length > 0">
        <h2>Recent Changes</h2>
        <div class="history-list">
          <div *ngFor="let item of history.slice(0, 5)" class="history-item">
            <div class="history-amount">₹{{ item.chargeAmount }}</div>
            <div class="history-desc">{{ item.description }}</div>
            <div class="history-by">by {{ item.updatedBy || 'Admin' }}</div>
          </div>
        </div>
      </div>

      <!-- Info Section -->
      <div class="card info-card">
        <h3>ℹ️ How it works</h3>
        <ul>
          <li><strong>Dynamic Pricing:</strong> Changes appear in app instantly</li>
          <li><strong>Zero Rupees:</strong> Set charge to 0 for free delivery</li>
          <li><strong>Billing Update:</strong> All new orders use the current charge</li>
          <li><strong>No App Update:</strong> No need to update the app to change charge</li>
          <li><strong>History Tracking:</strong> All changes are logged with admin info</li>
          <li><strong>Instant Effect:</strong> Changes take effect immediately</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .delivery-charge-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .page-header {
      margin-bottom: 30px;
    }

    .page-header h1 {
      font-size: 32px;
      margin: 0 0 8px 0;
      color: #333;
    }

    .page-header p {
      color: #666;
      margin: 0;
    }

    .card {
      background: white;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .card h2 {
      margin-top: 0;
      margin-bottom: 20px;
      color: #222;
      font-size: 20px;
    }

    .card h3 {
      margin-top: 0;
      color: #222;
    }

    /* Current Charge Display */
    .charge-display {
      text-align: center;
      padding: 30px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      color: white;
    }

    .charge-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .charge-amount {
      font-size: 48px;
      font-weight: bold;
      margin: 10px 0;
    }

    .charge-desc {
      font-size: 14px;
      opacity: 0.8;
      margin-bottom: 15px;
    }

    .charge-status {
      display: inline-block;
      padding: 6px 12px;
      background: rgba(255,255,255,0.2);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .charge-status.active {
      background: #4caf50;
      color: white;
    }

    /* Form Styles */
    .charge-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }

    .input-group {
      position: relative;
      display: flex;
      align-items: center;
    }

    .currency {
      position: absolute;
      left: 12px;
      font-weight: 600;
      color: #667eea;
      font-size: 16px;
    }

    .form-control {
      padding: 10px 12px 10px 32px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      font-size: 14px;
      width: 100%;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-group small {
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }

    /* Button Styles */
    .btn {
      padding: 12px 20px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Quick Set Buttons */
    .quick-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
    }

    .quick-btn {
      padding: 16px 12px;
      background: #f5f5f5;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      color: #666;
    }

    .quick-btn:hover {
      background: #efefef;
      border-color: #667eea;
    }

    .quick-btn.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .quick-btn .amount {
      display: block;
      font-size: 20px;
      font-weight: bold;
      margin-top: 8px;
    }

    /* History */
    .history-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .history-item {
      padding: 12px;
      background: #f9f9f9;
      border-left: 4px solid #667eea;
      border-radius: 4px;
    }

    .history-amount {
      font-size: 18px;
      font-weight: bold;
      color: #667eea;
    }

    .history-desc {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    .history-by {
      font-size: 11px;
      color: #999;
      margin-top: 4px;
    }

    /* Info Card */
    .info-card {
      background: #f0f4ff;
      border-left: 4px solid #667eea;
    }

    .info-card ul {
      margin: 0;
      padding-left: 20px;
      color: #555;
    }

    .info-card li {
      margin-bottom: 8px;
      line-height: 1.6;
    }

    @media (max-width: 600px) {
      .quick-buttons {
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      }

      .charge-amount {
        font-size: 36px;
      }
    }
  `]
})
export class DeliveryChargeComponent implements OnInit {
  chargeForm: FormGroup;
  currentCharge: DeliveryCharge = { chargeAmount: 0, description: 'Loading...' };
  history: any[] = [];
  isLoading = false;

  constructor(
    private api: ApiService,
    private fb: FormBuilder
  ) {
    this.chargeForm = this.fb.group({
      chargeAmount: [0, [Validators.required, Validators.min(0)]],
      description: ['']
    });
  }

  ngOnInit() {
    this.loadCurrentCharge();
    this.loadHistory();
  }

  loadCurrentCharge() {
    this.api.get<DeliveryCharge>('admin/delivery-charge').subscribe({
      next: (data) => {
        this.currentCharge = data;
        this.chargeForm.patchValue({
          chargeAmount: data.chargeAmount,
          description: data.description || ''
        });
      },
      error: (err) => {
        console.error('Failed to load delivery charge:', err);
        alert('Failed to load delivery charge');
      }
    });
  }

  loadHistory() {
    this.api.get<any[]>('admin/delivery-charge/history').subscribe({
      next: (data) => {
        this.history = data;
      },
      error: (err) => {
        console.error('Failed to load history:', err);
      }
    });
  }

  submitUpdate() {
    if (!this.chargeForm.valid) return;

    this.isLoading = true;
    const payload = {
      chargeAmount: this.chargeForm.value.chargeAmount,
      description: this.chargeForm.value.description
    };

    this.api.put<DeliveryCharge>('admin/delivery-charge', payload).subscribe({
      next: (updated) => {
        this.currentCharge = updated;
        this.loadHistory();
        this.isLoading = false;
        alert('✓ Delivery charge updated successfully!');
      },
      error: (err) => {
        console.error('Failed to update delivery charge:', err);
        alert('Failed to update delivery charge');
        this.isLoading = false;
      }
    });
  }

  setQuickCharge(amount: number) {
    this.chargeForm.patchValue({
      chargeAmount: amount,
      description: `Delivery charge set to ₹${amount}`
    });
    this.submitUpdate();
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface Banner {
  id: number;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
  title?: string;
  description?: string;
}

@Component({
  selector: 'app-banners',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="banners-container">
      <div class="page-header">
        <h1>🎨 Banner Management</h1>
        <p>Manage home page carousel banners</p>
      </div>

      <!-- Add Banner Form -->
      <div class="card add-banner-card">
        <h2>Add New Banner</h2>
        <form [formGroup]="bannerForm" (ngSubmit)="submitBanner()" class="banner-form">
          <div class="form-group">
            <label>Image URL *</label>
            <input type="text" formControlName="imageUrl" placeholder="https://example.com/image.png" class="form-control">
            <small>Enter the full URL or path to the banner image</small>
          </div>

          <div class="form-group">
            <label>Title</label>
            <input type="text" formControlName="title" placeholder="e.g., Chai & Poha" class="form-control">
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea formControlName="description" placeholder="Brief description of the banner" class="form-control" rows="2"></textarea>
          </div>

          <div class="form-group">
            <label>Display Order</label>
            <input type="number" formControlName="displayOrder" min="1" class="form-control">
            <small>Lower number = higher priority (shown first)</small>
          </div>

          <button type="submit" [disabled]="!bannerForm.valid || isLoading" class="btn btn-primary">
            {{ isLoading ? 'Adding...' : '+ Add Banner' }}
          </button>
        </form>
      </div>

      <!-- Banners List -->
      <div class="card banners-list-card">
        <h2>Current Banners ({{ banners.length }})</h2>
        
        <div *ngIf="banners.length === 0" class="empty-state">
          <p>No banners yet. Add your first banner above!</p>
        </div>

        <div *ngIf="banners.length > 0" class="banners-table-wrap">
          <table class="banners-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Title</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let banner of banners; let i = index" class="banner-row" [class.inactive]="!banner.isActive">
                <td class="preview-cell">
                  <img [src]="banner.imageUrl" [alt]="banner.title" class="banner-thumb">
                </td>
                <td>
                  <div class="title-cell">
                    <strong>{{ banner.title || 'Untitled' }}</strong>
                    <small>{{ banner.description }}</small>
                  </div>
                </td>
                <td>
                  <input type="number" [(ngModel)]="banner.displayOrder" (change)="updateBanner(banner)" min="1" class="order-input">
                </td>
                <td class="status-cell">
                  <span class="badge" [class.active]="banner.isActive" [class.inactive]="!banner.isActive">
                    {{ banner.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="actions-cell">
                  <button (click)="toggleBannerStatus(banner)" 
                          [title]="banner.isActive ? 'Deactivate' : 'Activate'"
                          class="btn btn-sm"
                          [class.btn-warning]="banner.isActive"
                          [class.btn-success]="!banner.isActive">
                    {{ banner.isActive ? '👁️ Deactivate' : '✓ Activate' }}
                  </button>
                  <button (click)="deleteBanner(banner.id)" 
                          title="Delete"
                          class="btn btn-sm btn-danger">
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Info Section -->
      <div class="card info-card">
        <h3>ℹ️ How it works</h3>
        <ul>
          <li><strong>Active Banners:</strong> Only active banners appear in the app</li>
          <li><strong>Display Order:</strong> Lower numbers appear first in the carousel</li>
          <li><strong>Image URL:</strong> Should be a direct link to an image file (PNG, JPG, etc.)</li>
          <li><strong>Auto-rotate:</strong> App automatically cycles through banners every 2 seconds</li>
          <li><strong>User Swipe:</strong> Users can swipe left/right to manually navigate banners</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .banners-container {
      max-width: 1200px;
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

    .banner-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
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

    .form-control {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      font-size: 14px;
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

    .btn {
      padding: 10px 16px;
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
      grid-column: span 2;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .btn-warning {
      background: #ffc107;
      color: #333;
    }

    .btn-warning:hover {
      background: #e0a800;
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-success:hover {
      background: #218838;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #999;
    }

    .banners-table-wrap {
      overflow-x: auto;
    }

    .banners-table {
      width: 100%;
      border-collapse: collapse;
    }

    .banners-table thead {
      background: #f8f9fa;
      border-bottom: 2px solid #ddd;
    }

    .banners-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #555;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .banners-table td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }

    .banner-row:hover {
      background: #fafafa;
    }

    .banner-row.inactive {
      opacity: 0.6;
    }

    .preview-cell {
      width: 80px;
    }

    .banner-thumb {
      width: 70px;
      height: 70px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid #ddd;
    }

    .title-cell {
      display: flex;
      flex-direction: column;
    }

    .title-cell strong {
      color: #222;
      margin-bottom: 4px;
    }

    .title-cell small {
      color: #999;
      font-size: 12px;
    }

    .order-input {
      width: 60px;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .status-cell {
      width: 100px;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge.active {
      background: #d4edda;
      color: #155724;
    }

    .badge.inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .actions-cell {
      display: flex;
      gap: 8px;
    }

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

    @media (max-width: 768px) {
      .banner-form {
        grid-template-columns: 1fr;
      }

      .btn-primary {
        grid-column: span 1;
      }

      .banners-table {
        font-size: 12px;
      }

      .banners-table th,
      .banners-table td {
        padding: 8px;
      }

      .banner-thumb {
        width: 50px;
        height: 50px;
      }
    }
  `]
})
export class BannersComponent implements OnInit {
  banners: Banner[] = [];
  bannerForm: FormGroup;
  isLoading = false;

  constructor(
    private api: ApiService,
    private fb: FormBuilder
  ) {
    this.bannerForm = this.fb.group({
      imageUrl: ['', [Validators.required, Validators.minLength(5)]],
      title: [''],
      description: [''],
      displayOrder: [this.getNextDisplayOrder(), Validators.required]
    });
  }

  ngOnInit() {
    this.loadBanners();
  }

  loadBanners() {
    this.api.get<Banner[]>('admin/banners').subscribe({
      next: (data) => {
        this.banners = data.sort((a, b) => a.displayOrder - b.displayOrder);
      },
      error: (err) => {
        console.error('Failed to load banners:', err);
        alert('Failed to load banners');
      }
    });
  }

  submitBanner() {
    if (!this.bannerForm.valid) return;

    this.isLoading = true;
    const newBanner: Banner = {
      id: 0,
      ...this.bannerForm.value,
      isActive: true
    };

    this.api.post<Banner>('admin/banners', newBanner).subscribe({
      next: (created) => {
        this.banners.push(created);
        this.banners.sort((a, b) => a.displayOrder - b.displayOrder);
        this.bannerForm.reset();
        this.bannerForm.patchValue({ displayOrder: this.getNextDisplayOrder() });
        this.isLoading = false;
        alert('Banner added successfully!');
      },
      error: (err) => {
        console.error('Failed to add banner:', err);
        alert('Failed to add banner');
        this.isLoading = false;
      }
    });
  }

  updateBanner(banner: Banner) {
    this.api.put(`admin/banners/${banner.id}`, banner).subscribe({
      next: () => {
        this.banners.sort((a, b) => a.displayOrder - b.displayOrder);
      },
      error: (err) => {
        console.error('Failed to update banner:', err);
        alert('Failed to update banner');
        this.loadBanners(); // Reload to revert changes
      }
    });
  }

  toggleBannerStatus(banner: Banner) {
    this.api.patch<Banner>(`admin/banners/${banner.id}/toggle`, {}).subscribe({
      next: (updated: Banner) => {
        banner.isActive = updated.isActive;
      },
      error: (err) => {
        console.error('Failed to toggle banner status:', err);
        alert('Failed to update banner status');
      }
    });
  }

  deleteBanner(id: number) {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    this.api.delete(`admin/banners/${id}`).subscribe({
      next: () => {
        this.banners = this.banners.filter(b => b.id !== id);
        alert('Banner deleted successfully!');
      },
      error: (err) => {
        console.error('Failed to delete banner:', err);
        alert('Failed to delete banner');
      }
    });
  }

  private getNextDisplayOrder(): number {
    if (this.banners.length === 0) return 1;
    return Math.max(...this.banners.map(b => b.displayOrder)) + 1;
  }
}

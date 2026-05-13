import { Component, ElementRef, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  styles: [`
    .form-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0 12px;
      align-items: start;
    }
    .hint-wrap { display: flex; flex-direction: column; }
    .hint-wrap mat-form-field { width: 100%; }
    .field-hint { font-size: 11px; color: #888; margin-top: -14px; padding-left: 14px; margin-bottom: 8px; }
    .upload-cell {
      display: flex; flex-direction: column; gap: 8px; justify-content: center; padding-top: 6px;
    }
    .img-preview { width: 52px; height: 52px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; }
    .action-row { display: flex; gap: 10px; align-items: center; padding-top: 6px; grid-column: span 2; }

    /* icon+text buttons — prevent overlap */
    .btn-inner { display: inline-flex; align-items: center; gap: 6px; line-height: 1; }
    .btn-inner .mat-icon { font-size: 18px; width: 18px; height: 18px; line-height: 18px; }

    /* Product card grid */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
      margin-top: 4px;
    }
    .product-card {
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: box-shadow 0.2s;
      background: #fff;
    }
    .product-card.inactive { opacity: 0.6; }
    .product-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
    .product-img-wrap { position: relative; height: 140px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; }
    .product-thumb { width: 100%; height: 100%; object-fit: cover; }
    .no-img-icon { font-size: 48px !important; width: 48px !important; height: 48px !important; color: #bbb; }
    .stock-badge {
      position: absolute; bottom: 6px; right: 6px;
      padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;
      background: #43a047; color: #fff;
    }
    .stock-badge.low { background: #e53935; }
    .stock-badge.mid { background: #fb8c00; }
    .product-info { padding: 10px 12px; flex: 1; }
    .product-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; line-height: 1.3; }
    .product-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
    .category-tag { background: #e3f2fd; color: #1565c0; font-size: 11px; padding: 2px 7px; border-radius: 10px; font-weight: 500; }
    .sku-tag { background: #f3e5f5; color: #6a1b9a; font-size: 11px; padding: 2px 7px; border-radius: 10px; }
    .product-price { display: flex; gap: 6px; align-items: baseline; }
    .selling-price { font-size: 16px; font-weight: 700; color: #1a1a1a; }
    .mrp { font-size: 12px; color: #999; text-decoration: line-through; }
    .discount { font-size: 11px; color: #43a047; font-weight: 600; }

    /* Status toggle chip */
    .status-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .status-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
      cursor: pointer; border: none; transition: all 0.2s;
    }
    .status-chip.active-chip { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
    .status-chip.inactive-chip { background: #fafafa; color: #757575; border: 1px solid #e0e0e0; }
    .status-chip .chip-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; line-height: 14px; }

    .product-actions { display: flex; gap: 4px; padding: 8px 10px 10px; border-top: 1px solid #f0f0f0; justify-content: flex-end; }

    /* Pagination */
    .pagination { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 20px; }
    .page-info { font-weight: 500; font-size: 14px; color: #555; }

    /* Empty state */
    .empty-state { text-align: center; padding: 48px 0; color: #aaa; }
    .empty-state .empty-icon { font-size: 56px !important; width: 56px !important; height: 56px !important; }
    .empty-state p { margin-top: 8px; font-size: 15px; }
  `],
  template: `
    <h2 class="page-title">Product Management</h2>

    <!-- ── Category form ── -->
    <section class="metric-card" style="margin-bottom:16px;">
      <h3 style="margin:0 0 14px;">Create Category</h3>
      <form [formGroup]="categoryForm" (ngSubmit)="createCategory()" class="form-grid">
        <mat-form-field appearance="outline"><mat-label>Name</mat-label><input matInput formControlName="name" /></mat-form-field>

        <div class="hint-wrap">
          <mat-form-field appearance="outline"><mat-label>Slug</mat-label><input matInput formControlName="slug" /></mat-form-field>
          <span class="field-hint">Auto-filled from name</span>
        </div>

        <mat-form-field appearance="outline"><mat-label>Image URL</mat-label><input matInput formControlName="imageUrl" /></mat-form-field>

        <div class="upload-cell">
          <input #catFileInput type="file" accept="image/*" style="display:none" (change)="uploadCategoryImage($any($event.target).files[0])" />
          <button mat-stroked-button type="button" [disabled]="catUploading()" (click)="catFileInput.click()">
            <span class="btn-inner"><mat-icon>cloud_upload</mat-icon>{{ catUploading() ? 'Uploading…' : 'Upload Image' }}</span>
          </button>
          <img *ngIf="categoryForm.get('imageUrl')?.value" [src]="categoryForm.get('imageUrl')?.value" alt="preview" class="img-preview" />
          <button mat-raised-button color="primary" type="submit" [disabled]="catSaving()">
            <span class="btn-inner"><mat-icon>save</mat-icon>{{ catSaving() ? 'Saving…' : 'Save Category' }}</span>
          </button>
        </div>
      </form>
    </section>

    <!-- ── Product form ── -->
    <section #productFormSection class="metric-card" style="margin-bottom:16px;">
      <h3 style="margin:0 0 14px;">{{ editingProductId() ? 'Update Product' : 'Create Product' }}</h3>
      <form [formGroup]="productForm" (ngSubmit)="saveProduct()" class="form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select formControlName="categoryId">
            <mat-option *ngFor="let c of categories()" [value]="c.id">{{ c.name }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline"><mat-label>Name</mat-label><input matInput formControlName="name" /></mat-form-field>

        <div class="hint-wrap">
          <mat-form-field appearance="outline"><mat-label>SKU</mat-label><input matInput formControlName="sku" /></mat-form-field>
          <span class="field-hint">Auto-filled from name &amp; unit</span>
        </div>

        <mat-form-field appearance="outline"><mat-label>Unit (e.g. 500g)</mat-label><input matInput formControlName="unit" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Stock Qty</mat-label><input matInput type="number" formControlName="stockQty" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>MRP (₹)</mat-label><input matInput type="number" formControlName="mrp" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Selling Price (₹)</mat-label><input matInput type="number" formControlName="sellingPrice" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Description</mat-label><input matInput formControlName="description" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Image URL</mat-label><input matInput formControlName="imageUrl" /></mat-form-field>

        <div class="upload-cell">
          <input #prodFileInput type="file" accept="image/*" style="display:none" (change)="uploadProductImage($any($event.target).files[0])" />
          <button mat-stroked-button type="button" [disabled]="prodUploading()" (click)="prodFileInput.click()">
            <span class="btn-inner"><mat-icon>cloud_upload</mat-icon>{{ prodUploading() ? 'Uploading…' : 'Upload Image' }}</span>
          </button>
          <img *ngIf="productForm.get('imageUrl')?.value" [src]="productForm.get('imageUrl')?.value" alt="preview" class="img-preview" />
        </div>

        <div class="action-row">
          <button mat-raised-button color="primary" type="submit" [disabled]="saving()">
            <span class="btn-inner">
              <mat-icon>{{ editingProductId() ? 'edit' : 'add_circle' }}</mat-icon>
              {{ saving() ? 'Saving…' : (editingProductId() ? 'Update Product' : 'Create Product') }}
            </span>
          </button>
          <button mat-stroked-button type="button" *ngIf="editingProductId()" [disabled]="saving()" (click)="cancelEdit()">
            <span class="btn-inner"><mat-icon>close</mat-icon>Cancel</span>
          </button>
        </div>
      </form>
    </section>

    <!-- ── Product list ── -->
    <section class="metric-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <mat-form-field appearance="outline" style="max-width:320px;margin-bottom:-20px;">
          <mat-label>Search products</mat-label>
          <mat-icon matPrefix style="margin-right:4px">search</mat-icon>
          <input matInput [value]="searchQuery()" (input)="onSearch(($any($event.target)).value)" />
        </mat-form-field>
        <span style="font-size:13px;color:#777;">{{ products().length }} product(s) on this page</span>
      </div>

      <div class="product-grid">
        <div *ngFor="let p of products()" class="product-card" [class.inactive]="!p.active">
          <div class="product-img-wrap">
            <img *ngIf="p.imageUrl" [src]="p.imageUrl" [alt]="p.name" class="product-thumb" />
            <mat-icon *ngIf="!p.imageUrl" class="no-img-icon">image_not_supported</mat-icon>
            <span class="stock-badge" [class.low]="p.stockQty === 0" [class.mid]="p.stockQty > 0 && p.stockQty < 10">
              {{ p.stockQty === 0 ? 'Out of Stock' : 'Stock: ' + p.stockQty }}
            </span>
          </div>
          <div class="product-info">
            <div class="product-name">{{ p.name }}</div>
            <div class="product-meta">
              <span class="category-tag">{{ p.categoryName }}</span>
              <span class="sku-tag">{{ p.sku }}</span>
            </div>
            <div class="product-price">
              <span class="selling-price">₹{{ p.sellingPrice }}</span>
              <span *ngIf="p.mrp && p.mrp !== p.sellingPrice" class="mrp">₹{{ p.mrp }}</span>
              <span *ngIf="p.mrp && p.mrp > p.sellingPrice" class="discount">
                {{ ((p.mrp - p.sellingPrice) / p.mrp * 100).toFixed(0) }}% off
              </span>
            </div>
            <!-- Visibility toggle -->
            <div class="status-row">
              <button type="button" class="status-chip"
                [class.active-chip]="p.active"
                [class.inactive-chip]="!p.active"
                [matTooltip]="p.active ? 'Visible on app — click to hide' : 'Hidden from app — click to show'"
                (click)="toggleActive(p)">
                <mat-icon class="chip-icon">{{ p.active ? 'visibility' : 'visibility_off' }}</mat-icon>
                {{ p.active ? 'Live' : 'Hidden' }}
              </button>
              <span style="font-size:11px;color:#aaa;">{{ p.active ? 'Shown in customer app' : 'Not shown to customers' }}</span>
            </div>
          </div>
          <div class="product-actions">
            <button mat-icon-button (click)="editProduct(p)" matTooltip="Edit product" color="primary">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="deleteProduct(p.id)" matTooltip="Delete product">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="products().length === 0" class="empty-state">
        <mat-icon class="empty-icon">inventory_2</mat-icon>
        <p>No products found</p>
      </div>

      <div class="pagination">
        <button mat-stroked-button (click)="prevPage()" [disabled]="currentPage() === 0">
          <span class="btn-inner"><mat-icon>chevron_left</mat-icon>Previous</span>
        </button>
        <span class="page-info">Page {{ currentPage() + 1 }} / {{ totalPages() }}</span>
        <button mat-stroked-button (click)="nextPage()" [disabled]="currentPage() + 1 >= totalPages()">
          <span class="btn-inner">Next<mat-icon>chevron_right</mat-icon></span>
        </button>
      </div>
    </section>
  `
})
export class ProductsComponent implements OnInit, OnDestroy {
  readonly products = signal<any[]>([]);
  readonly categories = signal<any[]>([]);
  readonly editingProductId = signal<number | null>(null);
  readonly currentPage = signal(0);
  readonly totalPages = signal(1);
  readonly searchQuery = signal('');
  readonly prodUploading = signal(false);
  readonly catUploading = signal(false);
  readonly saving = signal(false);
  readonly catSaving = signal(false);

  @ViewChild('productFormSection') productFormSection!: ElementRef;
  private subs = new Subscription();

  readonly categoryForm = this.fb.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    imageUrl: [''],
    active: [true]
  });

  readonly productForm = this.fb.group({
    categoryId: [null as number | null, Validators.required],
    name: ['', Validators.required],
    sku: ['', Validators.required],
    description: [''],
    unit: ['', Validators.required],
    mrp: [0, Validators.required],
    sellingPrice: [0, Validators.required],
    stockQty: [0, Validators.required],
    imageUrl: [''],
    active: [true]
  });

  constructor(private api: ApiService, private fb: FormBuilder, private snack: MatSnackBar, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
    this.setupAutoGenerate();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private toSlug(s: string): string {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private toSku(name: string, unit: string): string {
    const n = name.toUpperCase().trim().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    const u = unit.toUpperCase().trim().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    return u ? `${n}-${u}` : n;
  }

  private setupAutoGenerate(): void {
    // Auto-generate slug from category name
    this.subs.add(this.categoryForm.get('name')!.valueChanges.subscribe(name => {
      const slugCtrl = this.categoryForm.get('slug')!;
      // Only auto-fill if user hasn't manually typed a slug
      if (!slugCtrl.dirty) {
        slugCtrl.setValue(this.toSlug(name || ''), { emitEvent: false });
      }
    }));

    // Auto-generate SKU from product name + unit
    const updateSku = () => {
      const skuCtrl = this.productForm.get('sku')!;
      if (!skuCtrl.dirty) {
        const name = this.productForm.get('name')!.value || '';
        const unit = this.productForm.get('unit')!.value || '';
        skuCtrl.setValue(this.toSku(name, unit), { emitEvent: false });
      }
    };
    this.subs.add(this.productForm.get('name')!.valueChanges.subscribe(updateSku));
    this.subs.add(this.productForm.get('unit')!.valueChanges.subscribe(updateSku));
  }

  loadProducts(page = this.currentPage()) {
    this.api.get<any>('/catalog/products', { page, size: 20, query: this.searchQuery() }).subscribe((res) => {
      this.currentPage.set(res.number ?? page);
      this.totalPages.set(res.totalPages || 1);
      this.products.set(res.content || []);
    });
  }

  onSearch(query: string) {
    this.searchQuery.set(query.trim());
    this.currentPage.set(0);
    this.loadProducts(0);
  }

  prevPage() {
    if (this.currentPage() === 0) return;
    this.loadProducts(this.currentPage() - 1);
  }

  nextPage() {
    if (this.currentPage() + 1 >= this.totalPages()) return;
    this.loadProducts(this.currentPage() + 1);
  }

  loadCategories() {
    this.api.get<any[]>('/admin/catalog/categories').subscribe((res) => this.categories.set(res || []));
  }

  createCategory() {
    if (this.categoryForm.invalid) return;
    this.catSaving.set(true);
    this.api.post('/admin/catalog/categories', this.categoryForm.getRawValue()).subscribe({
      next: () => {
        this.catSaving.set(false);
        this.categoryForm.reset({ name: '', slug: '', imageUrl: '', active: true });
        this.loadCategories();
        this.snack.open('Category created ✓', 'OK', { duration: 2500, panelClass: ['snack-success'] });
      },
      error: (err) => {
        this.catSaving.set(false);
        this.snack.open(err?.error?.message || 'Failed to create category', 'OK', { duration: 3500, panelClass: ['snack-error'] });
      }
    });
  }

  saveProduct() {
    if (this.productForm.invalid) return;
    const payload = this.productForm.getRawValue();
    const id = this.editingProductId();
    this.saving.set(true);
    const req = id ? this.api.put(`/admin/catalog/products/${id}`, payload) : this.api.post('/admin/catalog/products', payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelEdit();
        this.loadProducts();
        this.snack.open(id ? 'Product updated ✓' : 'Product created ✓', 'OK', { duration: 2500, panelClass: ['snack-success'] });
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.message || 'Save failed', 'OK', { duration: 3500, panelClass: ['snack-error'] });
      }
    });
  }

  uploadProductImage(file: File) {
    if (!file) return;
    this.prodUploading.set(true);
    this.api.uploadFile<{ url: string }>('/admin/catalog/upload-image', file).subscribe({
      next: (res) => {
        this.productForm.patchValue({ imageUrl: res.url });
        this.prodUploading.set(false);
        this.snack.open('Image uploaded', 'OK', { duration: 2000 });
      },
      error: (err) => {
        this.prodUploading.set(false);
        this.snack.open(err?.error?.message || 'Upload failed', 'OK', { duration: 3000 });
      }
    });
  }

  uploadCategoryImage(file: File) {
    if (!file) return;
    this.catUploading.set(true);
    this.api.uploadFile<{ url: string }>('/admin/catalog/upload-image', file).subscribe({
      next: (res) => {
        this.categoryForm.patchValue({ imageUrl: res.url });
        this.catUploading.set(false);
        this.snack.open('Image uploaded', 'OK', { duration: 2000 });
      },
      error: (err) => {
        this.catUploading.set(false);
        this.snack.open(err?.error?.message || 'Upload failed', 'OK', { duration: 3000 });
      }
    });
  }

  editProduct(product: any) {
    this.editingProductId.set(product.id);
    setTimeout(() => {
      this.productFormSection?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    this.productForm.patchValue({
      categoryId: product.categoryId,
      name: product.name,
      sku: product.sku,
      description: product.description,
      unit: product.unit,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      stockQty: product.stockQty,
      imageUrl: product.imageUrl,
      active: product.active
    });
  }

  cancelEdit() {
    this.editingProductId.set(null);
    this.productForm.reset({ categoryId: null, name: '', sku: '', description: '', unit: '', mrp: 0, sellingPrice: 0, stockQty: 0, imageUrl: '', active: true });
    // Mark pristine so auto-generate resumes
    this.productForm.get('sku')!.markAsPristine();
  }

  toggleActive(product: any) {
    const updated = { ...product, active: !product.active };
    this.api.put(`/admin/catalog/products/${product.id}`, updated).subscribe({
      next: () => {
        this.products.update(list => list.map(p => p.id === product.id ? { ...p, active: !p.active } : p));
        this.snack.open(updated.active ? 'Product is now visible in app ✓' : 'Product hidden from app', 'OK', { duration: 2500 });
      },
      error: (err) => {
        this.snack.open(err?.error?.message || 'Failed to update visibility', 'OK', { duration: 3000, panelClass: ['snack-error'] });
      }
    });
  }

  deleteProduct(id: number) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Product', message: 'This will remove the product from catalog.' }
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.api.delete(`/admin/catalog/products/${id}`).subscribe(() => {
        this.loadProducts();
        this.snack.open('Product deleted', 'OK', { duration: 1800 });
      });
    });
  }
}

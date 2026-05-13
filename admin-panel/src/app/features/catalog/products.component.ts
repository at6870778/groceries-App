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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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
    MatSlideToggleModule,
  ],
  styles: [`
    /* ── shared ── */
    .section-title { margin: 0 0 14px; font-size: 15px; font-weight: 600; color: #222; }
    .img-preview { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; flex-shrink: 0; }

    /* ── category form ── */
    .cat-fields { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 12px; }
    .hint-wrap { display: flex; flex-direction: column; }
    .hint-wrap mat-form-field { width: 100%; }
    .field-hint { font-size: 11px; color: #9e9e9e; padding: 0 14px; margin-top: -18px; margin-bottom: 6px; }
    .form-action-bar {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 6px; padding-top: 10px; border-top: 1px solid #f0f0f0;
    }
    .upload-row { display: flex; align-items: center; gap: 10px; }

    /* ── product form ── */
    .prod-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0 12px; }
    .prod-footer {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
      margin-top: 6px; padding-top: 10px; border-top: 1px solid #f0f0f0;
    }
    .prod-footer-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .prod-footer-left mat-form-field { width: 240px; margin-bottom: 0; }
    .prod-footer-right { display: flex; align-items: center; gap: 8px; }

    /* ── product grid ── */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 14px;
    }
    .product-card {
      border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;
      display: flex; flex-direction: column; background: #fff;
      transition: box-shadow .2s, opacity .2s;
    }
    .product-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }
    .product-card.inactive { opacity: .55; }

    .product-img-wrap { position: relative; height: 140px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .product-thumb { width: 100%; height: 100%; object-fit: cover; }
    .no-img-icon { font-size: 52px !important; width: 52px !important; height: 52px !important; color: #ccc; }
    .stock-badge {
      position: absolute; top: 8px; right: 8px;
      padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600;
      background: #43a047; color: #fff; letter-spacing: .3px;
    }
    .stock-badge.out { background: #e53935; }
    .stock-badge.low { background: #fb8c00; }

    .product-info { padding: 10px 12px; flex: 1; }
    .product-name { font-weight: 600; font-size: 14px; line-height: 1.35; margin-bottom: 5px; }
    .product-meta { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 7px; }
    .cat-tag { background: #e3f2fd; color: #1565c0; font-size: 11px; padding: 2px 8px; border-radius: 20px; font-weight: 500; }
    .sku-tag { background: #f3e5f5; color: #6a1b9a; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
    .price-row { display: flex; gap: 6px; align-items: baseline; margin-bottom: 8px; }
    .sell-price { font-size: 15px; font-weight: 700; }
    .mrp-price { font-size: 12px; color: #aaa; text-decoration: line-through; }
    .disc-pct { font-size: 11px; color: #43a047; font-weight: 600; }
    .visibility-row { display: flex; align-items: center; gap: 8px; padding-top: 4px; }
    .vis-label { font-size: 12px; color: #666; }

    .card-actions { display: flex; justify-content: flex-end; gap: 4px; padding: 6px 8px 8px; border-top: 1px solid #f0f0f0; }

    /* ── pagination ── */
    .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 20px; }
    .page-info { font-size: 14px; font-weight: 500; color: #555; }

    /* ── empty state ── */
    .empty-state { text-align: center; padding: 40px 0; color: #bbb; }
    .empty-icon { font-size: 56px !important; width: 56px !important; height: 56px !important; }
    .empty-state p { margin-top: 6px; font-size: 14px; }
  `],
  template: `
    <h2 class="page-title">Product Management</h2>

    <!-- ══ Category form ══ -->
    <section class="metric-card" style="margin-bottom:16px;">
      <p class="section-title">Create Category</p>
      <form [formGroup]="categoryForm" (ngSubmit)="createCategory()">
        <div class="cat-fields">
          <mat-form-field appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>

          <div class="hint-wrap">
            <mat-form-field appearance="outline">
              <mat-label>Slug</mat-label>
              <input matInput formControlName="slug" />
            </mat-form-field>
            <span class="field-hint">Auto-filled from name</span>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Image URL</mat-label>
            <input matInput formControlName="imageUrl" />
          </mat-form-field>
        </div>

        <div class="form-action-bar">
          <div class="upload-row">
            <input #catFileInput type="file" accept="image/*" style="display:none"
              (change)="uploadCategoryImage($any($event.target).files[0])" />
            <button mat-stroked-button type="button" [disabled]="catUploading()" (click)="catFileInput.click()">
              <mat-icon>cloud_upload</mat-icon>
              {{ catUploading() ? 'Uploading…' : 'Upload Image' }}
            </button>
            <img *ngIf="categoryForm.get('imageUrl')?.value"
              [src]="categoryForm.get('imageUrl')?.value" alt="preview" class="img-preview" />
          </div>
          <button mat-flat-button color="primary" type="submit" [disabled]="catSaving()">
            <mat-icon>save</mat-icon>
            {{ catSaving() ? 'Saving…' : 'Save Category' }}
          </button>
        </div>
      </form>
    </section>

    <!-- ══ Product form ══ -->
    <section #productFormSection class="metric-card" style="margin-bottom:16px;">
      <p class="section-title">{{ editingProductId() ? 'Update Product' : 'Create Product' }}</p>
      <form [formGroup]="productForm" (ngSubmit)="saveProduct()">

        <!-- Row 1 -->
        <div class="prod-row">
          <mat-form-field appearance="outline">
            <mat-label>Category</mat-label>
            <mat-select formControlName="categoryId">
              <mat-option *ngFor="let c of categories()" [value]="c.id">{{ c.name }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <div class="hint-wrap">
            <mat-form-field appearance="outline">
              <mat-label>SKU</mat-label>
              <input matInput formControlName="sku" />
            </mat-form-field>
            <span class="field-hint">Auto-filled from name &amp; unit</span>
          </div>
          <mat-form-field appearance="outline">
            <mat-label>Unit (e.g. 500g)</mat-label>
            <input matInput formControlName="unit" />
          </mat-form-field>
        </div>

        <!-- Row 2 -->
        <div class="prod-row">
          <mat-form-field appearance="outline">
            <mat-label>Stock Qty</mat-label>
            <input matInput type="number" formControlName="stockQty" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>MRP (₹)</mat-label>
            <input matInput type="number" formControlName="mrp" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Selling Price (₹)</mat-label>
            <input matInput type="number" formControlName="sellingPrice" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Description</mat-label>
            <input matInput formControlName="description" />
          </mat-form-field>
        </div>

        <!-- Footer row: image + upload + action buttons -->
        <div class="prod-footer">
          <div class="prod-footer-left">
            <mat-form-field appearance="outline">
              <mat-label>Image URL</mat-label>
              <input matInput formControlName="imageUrl" />
            </mat-form-field>
            <input #prodFileInput type="file" accept="image/*" style="display:none"
              (change)="uploadProductImage($any($event.target).files[0])" />
            <button mat-stroked-button type="button" [disabled]="prodUploading()" (click)="prodFileInput.click()">
              <mat-icon>cloud_upload</mat-icon>
              {{ prodUploading() ? 'Uploading…' : 'Upload Image' }}
            </button>
            <img *ngIf="productForm.get('imageUrl')?.value"
              [src]="productForm.get('imageUrl')?.value" alt="preview" class="img-preview" />
          </div>
          <div class="prod-footer-right">
            <button mat-stroked-button type="button" *ngIf="editingProductId()" [disabled]="saving()" (click)="cancelEdit()">
              <mat-icon>close</mat-icon> Cancel
            </button>
            <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
              <mat-icon>{{ editingProductId() ? 'save' : 'add_circle' }}</mat-icon>
              {{ saving() ? 'Saving…' : (editingProductId() ? 'Update Product' : 'Create Product') }}
            </button>
          </div>
        </div>
      </form>
    </section>

    <!-- ══ Product list ══ -->
    <section class="metric-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <mat-form-field appearance="outline" style="max-width:300px;margin-bottom:-22px;">
          <mat-label>Search products</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [value]="searchQuery()" (input)="onSearch(($any($event.target)).value)" />
        </mat-form-field>
        <span style="font-size:13px;color:#888;">{{ products().length }} item(s) on this page</span>
      </div>

      <div class="product-grid">
        <div *ngFor="let p of products()" class="product-card" [class.inactive]="!p.active">

          <!-- Image -->
          <div class="product-img-wrap">
            <img *ngIf="p.imageUrl" [src]="p.imageUrl" [alt]="p.name" class="product-thumb" />
            <mat-icon *ngIf="!p.imageUrl" class="no-img-icon">image_not_supported</mat-icon>
            <span class="stock-badge"
              [class.out]="p.stockQty === 0"
              [class.low]="p.stockQty > 0 && p.stockQty < 10">
              {{ p.stockQty === 0 ? 'Out of Stock' : p.stockQty + ' left' }}
            </span>
          </div>

          <!-- Info -->
          <div class="product-info">
            <div class="product-name">{{ p.name }}</div>
            <div class="product-meta">
              <span class="cat-tag">{{ p.categoryName }}</span>
              <span class="sku-tag">{{ p.sku }}</span>
            </div>
            <div class="price-row">
              <span class="sell-price">₹{{ p.sellingPrice }}</span>
              <span *ngIf="p.mrp && p.mrp !== p.sellingPrice" class="mrp-price">₹{{ p.mrp }}</span>
              <span *ngIf="p.mrp && p.mrp > p.sellingPrice" class="disc-pct">
                {{ ((p.mrp - p.sellingPrice) / p.mrp * 100).toFixed(0) }}% off
              </span>
            </div>
            <div class="visibility-row">
              <mat-slide-toggle
                [checked]="p.active"
                (change)="toggleActive(p)"
                color="primary">
              </mat-slide-toggle>
              <span class="vis-label">{{ p.active ? 'Visible in app' : 'Hidden from app' }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="card-actions">
            <button mat-icon-button color="primary" (click)="editProduct(p)" matTooltip="Edit">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="deleteProduct(p.id)" matTooltip="Delete">
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
          <mat-icon>chevron_left</mat-icon> Previous
        </button>
        <span class="page-info">Page {{ currentPage() + 1 }} / {{ totalPages() }}</span>
        <button mat-stroked-button (click)="nextPage()" [disabled]="currentPage() + 1 >= totalPages()">
          Next <mat-icon>chevron_right</mat-icon>
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

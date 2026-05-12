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
import { MatTableModule } from '@angular/material/table';
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
    MatTableModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 class="page-title">Product Management</h2>

    <section class="metric-card" style="margin-bottom:12px;">
      <h3 style="margin-top:0;">Create Category</h3>
      <form [formGroup]="categoryForm" (ngSubmit)="createCategory()" style="display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px;align-items:start;">
        <mat-form-field appearance="outline"><mat-label>Name</mat-label><input matInput formControlName="name" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Slug</mat-label><input matInput formControlName="slug" /><mat-hint>Auto-filled from name</mat-hint></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Image URL</mat-label><input matInput formControlName="imageUrl" /></mat-form-field>
        <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;">
          <input #catFileInput type="file" accept="image/*" style="display:none" (change)="uploadCategoryImage($any($event.target).files[0])" />
          <button mat-stroked-button type="button" [disabled]="catUploading()" (click)="catFileInput.click()">
            <mat-spinner *ngIf="catUploading()" diameter="16" style="display:inline-block;margin-right:4px;"></mat-spinner>
            {{ catUploading() ? 'Uploading…' : '📂 Upload' }}
          </button>
          <img *ngIf="categoryForm.get('imageUrl')?.value" [src]="categoryForm.get('imageUrl')?.value" alt="preview" style="width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid #ddd;" />
        </div>
        <div style="display:flex;align-items:center;">
          <button mat-flat-button color="primary" type="submit" [disabled]="catSaving()">
            <mat-spinner *ngIf="catSaving()" diameter="16" style="display:inline-block;margin-right:6px;"></mat-spinner>
            {{ catSaving() ? 'Saving…' : 'Save Category' }}
          </button>
        </div>
      </form>
    </section>

    <section #productFormSection class="metric-card" style="margin-bottom:12px;">
      <h3 style="margin-top:0;">{{ editingProductId() ? 'Update Product' : 'Create Product' }}</h3>
      <form [formGroup]="productForm" (ngSubmit)="saveProduct()" style="display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px;">
        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select formControlName="categoryId">
            <mat-option *ngFor="let c of categories()" [value]="c.id">{{ c.name }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Name</mat-label><input matInput formControlName="name" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>SKU</mat-label><input matInput formControlName="sku" /><mat-hint>Auto-filled from name &amp; unit</mat-hint></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Unit</mat-label><input matInput formControlName="unit" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Stock</mat-label><input matInput type="number" formControlName="stockQty" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>MRP</mat-label><input matInput type="number" formControlName="mrp" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Selling</mat-label><input matInput type="number" formControlName="sellingPrice" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Image URL</mat-label><input matInput formControlName="imageUrl" /></mat-form-field>
        <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;">
          <input #prodFileInput type="file" accept="image/*" style="display:none" (change)="uploadProductImage($any($event.target).files[0])" />
          <button mat-stroked-button type="button" [disabled]="prodUploading()" (click)="prodFileInput.click()">
            <mat-spinner *ngIf="prodUploading()" diameter="16" style="display:inline-block;margin-right:4px;"></mat-spinner>
            {{ prodUploading() ? 'Uploading…' : '📂 Upload' }}
          </button>
          <img *ngIf="productForm.get('imageUrl')?.value" [src]="productForm.get('imageUrl')?.value" alt="preview" style="width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid #ddd;" />
        </div>
        <mat-form-field appearance="outline" style="grid-column: span 2;"><mat-label>Description</mat-label><input matInput formControlName="description" /></mat-form-field>
        <div style="display:flex;gap:8px;align-items:center;">
          <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
            <mat-spinner *ngIf="saving()" diameter="16" style="display:inline-block;margin-right:6px;"></mat-spinner>
            {{ saving() ? 'Saving…' : (editingProductId() ? 'Update' : 'Create') }}
          </button>
          <button mat-button type="button" *ngIf="editingProductId()" [disabled]="saving()" (click)="cancelEdit()">Cancel</button>
        </div>
      </form>

    </section>

    <section class="metric-card" style="overflow:auto;">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
        <mat-form-field appearance="outline" style="max-width:320px;">
          <mat-label>Search products</mat-label>
          <input matInput [value]="searchQuery()" (input)="onSearch(($any($event.target)).value)" />
        </mat-form-field>
      </div>

      <table mat-table [dataSource]="products()" style="width:100%;">
        <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let p">{{ p.name }}</td></ng-container>
        <ng-container matColumnDef="category"><th mat-header-cell *matHeaderCellDef>Category</th><td mat-cell *matCellDef="let p">{{ p.categoryName }}</td></ng-container>
        <ng-container matColumnDef="price"><th mat-header-cell *matHeaderCellDef>Price</th><td mat-cell *matCellDef="let p">Rs {{ p.sellingPrice }}</td></ng-container>
        <ng-container matColumnDef="stock"><th mat-header-cell *matHeaderCellDef>Stock</th><td mat-cell *matCellDef="let p">{{ p.stockQty }}</td></ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let p">
            <button mat-button (click)="editProduct(p)">Edit</button>
            <button mat-button color="warn" (click)="deleteProduct(p.id)">Delete</button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      <div style="display:flex;justify-content:flex-end;gap:8px;align-items:center;margin-top:10px;">
        <button mat-button (click)="prevPage()" [disabled]="currentPage() === 0">Previous</button>
        <span>Page {{ currentPage() + 1 }} / {{ totalPages() }}</span>
        <button mat-button (click)="nextPage()" [disabled]="currentPage() + 1 >= totalPages()">Next</button>
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
  readonly displayedColumns = ['name', 'category', 'price', 'stock', 'actions'];
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

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
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
    MatTableModule
  ],
  template: `
    <h2 class="page-title">Product Management</h2>

    <section class="metric-card" style="margin-bottom:12px;">
      <h3 style="margin-top:0;">Create Category</h3>
      <form [formGroup]="categoryForm" (ngSubmit)="createCategory()" style="display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:10px;">
        <mat-form-field appearance="outline"><mat-label>Name</mat-label><input matInput formControlName="name" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Slug</mat-label><input matInput formControlName="slug" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Image URL</mat-label><input matInput formControlName="imageUrl" /></mat-form-field>
        <div style="display:flex;align-items:center;"><button mat-flat-button color="primary" type="submit">Save Category</button></div>
      </form>
    </section>

    <section class="metric-card" style="margin-bottom:12px;">
      <h3 style="margin-top:0;">{{ editingProductId() ? 'Update Product' : 'Create Product' }}</h3>
      <form [formGroup]="productForm" (ngSubmit)="saveProduct()" style="display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px;">
        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select formControlName="categoryId">
            <mat-option *ngFor="let c of categories()" [value]="c.id">{{ c.name }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Name</mat-label><input matInput formControlName="name" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>SKU</mat-label><input matInput formControlName="sku" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Unit</mat-label><input matInput formControlName="unit" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Stock</mat-label><input matInput type="number" formControlName="stockQty" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>MRP</mat-label><input matInput type="number" formControlName="mrp" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Selling</mat-label><input matInput type="number" formControlName="sellingPrice" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Image URL</mat-label><input matInput formControlName="imageUrl" /></mat-form-field>
        <mat-form-field appearance="outline" style="grid-column: span 2;"><mat-label>Description</mat-label><input matInput formControlName="description" /></mat-form-field>
        <div style="display:flex;gap:8px;align-items:center;">
          <button mat-flat-button color="primary" type="submit">{{ editingProductId() ? 'Update' : 'Create' }}</button>
          <button mat-button type="button" *ngIf="editingProductId()" (click)="cancelEdit()">Cancel</button>
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
export class ProductsComponent implements OnInit {
  readonly products = signal<any[]>([]);
  readonly categories = signal<any[]>([]);
  readonly editingProductId = signal<number | null>(null);
  readonly currentPage = signal(0);
  readonly totalPages = signal(1);
  readonly searchQuery = signal('');
  readonly displayedColumns = ['name', 'category', 'price', 'stock', 'actions'];

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
    this.api.post('/admin/catalog/categories', this.categoryForm.getRawValue()).subscribe(() => {
      this.categoryForm.reset({ name: '', slug: '', imageUrl: '', active: true });
      this.loadCategories();
      this.snack.open('Category created', 'OK', { duration: 1800 });
    });
  }

  saveProduct() {
    if (this.productForm.invalid) return;
    const payload = this.productForm.getRawValue();
    const id = this.editingProductId();

    const req = id ? this.api.put(`/admin/catalog/products/${id}`, payload) : this.api.post('/admin/catalog/products', payload);
    req.subscribe(() => {
      this.cancelEdit();
      this.loadProducts();
      this.snack.open(id ? 'Product updated' : 'Product created', 'OK', { duration: 1800 });
    });
  }

  editProduct(product: any) {
    this.editingProductId.set(product.id);
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

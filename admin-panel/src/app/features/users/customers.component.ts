import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatTableModule],
  template: `
    <h2 class="page-title">Customers</h2>
    <section class="metric-card" style="margin-bottom:10px;">
      <form [formGroup]="form" (ngSubmit)="create()" style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;">
        <mat-form-field appearance="outline"><mat-label>Full Name</mat-label><input matInput formControlName="fullName" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Phone</mat-label><input matInput formControlName="phone" /></mat-form-field>
        <button mat-flat-button color="primary" type="submit">Create</button>
      </form>
    </section>

    <section class="metric-card" style="overflow:auto;">
      <table mat-table [dataSource]="users()" style="width:100%;">
        <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let u">{{ u.fullName }}</td></ng-container>
        <ng-container matColumnDef="phone"><th mat-header-cell *matHeaderCellDef>Phone</th><td mat-cell *matCellDef="let u">{{ u.phone }}</td></ng-container>
        <ng-container matColumnDef="active"><th mat-header-cell *matHeaderCellDef>Active</th><td mat-cell *matCellDef="let u">{{ u.active ? 'Yes' : 'No' }}</td></ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let u"><button mat-button (click)="toggle(u)">{{ u.active ? 'Deactivate' : 'Activate' }}</button></td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>

      <div style="display:flex;justify-content:flex-end;gap:8px;align-items:center;margin-top:10px;">
        <button mat-button (click)="prevPage()" [disabled]="currentPage() === 0">Previous</button>
        <span>Page {{ currentPage() + 1 }} / {{ totalPages() }}</span>
        <button mat-button (click)="nextPage()" [disabled]="currentPage() + 1 >= totalPages()">Next</button>
      </div>
    </section>
  `
})
export class CustomersComponent implements OnInit {
  readonly users = signal<any[]>([]);
  readonly currentPage = signal(0);
  readonly totalPages = signal(1);
  readonly columns = ['name', 'phone', 'active', 'actions'];
  readonly form = this.fb.group({
    fullName: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]]
  });

  constructor(private api: ApiService, private fb: FormBuilder, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.load();
  }

  load(page = this.currentPage()) {
    this.api.get<any>('/admin/customers', { page, size: 20 }).subscribe((res) => {
      this.currentPage.set(res.number ?? page);
      this.totalPages.set(res.totalPages || 1);
      this.users.set(res.content || []);
    });
  }

  prevPage() {
    if (this.currentPage() === 0) return;
    this.load(this.currentPage() - 1);
  }

  nextPage() {
    if (this.currentPage() + 1 >= this.totalPages()) return;
    this.load(this.currentPage() + 1);
  }

  create() {
    if (this.form.invalid) return;
    this.api.post('/admin/customers', this.form.getRawValue()).subscribe(() => {
      this.form.reset({ fullName: '', phone: '' });
      this.load();
      this.snack.open('Customer created', 'OK', { duration: 1600 });
    });
  }

  toggle(user: any) {
    this.api.patch(`/admin/users/${user.id}/active`, { active: !user.active }).subscribe(() => {
      this.load();
      this.snack.open('Customer status updated', 'OK', { duration: 1600 });
    });
  }
}

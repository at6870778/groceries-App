import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface UserWithRoles {
  id: number;
  fullName: string;
  phone: string;
  active: boolean;
  roles: string[];
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatChipsModule,
    MatIconModule
  ],
  template: `
    <h2 class="page-title">👥 All Users & Roles</h2>

    <!-- Search Section -->
    <section class="metric-card" style="margin-bottom:20px;">
      <div style="display:grid;grid-template-columns:1fr auto;gap:10px;">
        <mat-form-field appearance="outline" style="width:100%;">
          <mat-label>Search by Name or Phone</mat-label>
          <input matInput [(ngModel)]="searchTerm" (keyup.enter)="search()" placeholder="e.g., Admin or 9876543210" />
        </mat-form-field>
        <button mat-flat-button color="primary" (click)="search()" [disabled]="loading()">
          🔍 Search
        </button>
        <button mat-button (click)="resetSearch()" [disabled]="loading() || !searchTerm">
          ✕ Clear
        </button>
      </div>
    </section>

    <!-- Users Table -->
    <section class="metric-card" style="overflow:auto;">
      <div *ngIf="users().length > 0; else noData">
        <table mat-table [dataSource]="users()" style="width:100%;" class="users-table">
          <!-- ID Column -->
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef style="width:60px;">ID</th>
            <td mat-cell *matCellDef="let u" style="font-weight:600;">{{ u.id }}</td>
          </ng-container>

          <!-- Name Column -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let u">{{ u.fullName }}</td>
          </ng-container>

          <!-- Phone Column -->
          <ng-container matColumnDef="phone">
            <th mat-header-cell *matHeaderCellDef>Phone</th>
            <td mat-cell *matCellDef="let u">{{ u.phone }}</td>
          </ng-container>

          <!-- Roles Column -->
          <ng-container matColumnDef="roles">
            <th mat-header-cell *matHeaderCellDef>Roles</th>
            <td mat-cell *matCellDef="let u">
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <mat-chip
                  *ngFor="let role of u.roles"
                  [ngClass]="'role-chip-' + role.toLowerCase()"
                  disabled>
                  {{ getRoleEmoji(role) }} {{ role }}
                </mat-chip>
                <span *ngIf="u.roles.length === 0" style="color:#9e9e9e;font-size:12px;">No roles assigned</span>
              </div>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef style="width:80px;">Status</th>
            <td mat-cell *matCellDef="let u">
              <span [ngClass]="u.active ? 'status-active' : 'status-inactive'">
                {{ u.active ? '✅ Active' : '⭕ Inactive' }}
              </span>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef style="width:120px;">Actions</th>
            <td mat-cell *matCellDef="let u">
              <button
                mat-icon-button
                matTooltip="Manage Roles"
                (click)="manageRoles(u)"
                color="primary">
                <mat-icon>edit</mat-icon>
              </button>
              <button
                mat-icon-button
                matTooltip="Toggle Active"
                (click)="toggleActive(u)"
                [color]="u.active ? 'warn' : 'accent'">
                <mat-icon>{{ u.active ? 'toggle_on' : 'toggle_off' }}</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>

        <!-- Pagination -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;">
          <span style="color:#9e9e9e;font-size:14px;">
            Total: {{ totalUsers() }} users | Page {{ currentPage() + 1 }} of {{ totalPages() }}
          </span>
          <div style="display:flex;gap:8px;">
            <button mat-button (click)="prevPage()" [disabled]="currentPage() === 0 || loading()">
              ← Previous
            </button>
            <button mat-button (click)="nextPage()" [disabled]="currentPage() + 1 >= totalPages() || loading()">
              Next →
            </button>
          </div>
        </div>
      </div>

      <ng-template #noData>
        <p style="text-align:center;color:#9e9e9e;padding:40px;">
          📭 No users found
        </p>
      </ng-template>
    </section>
  `,
  styles: [`
    .page-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 20px;
      color: #1a1a1a;
    }

    .metric-card {
      background: #f7f9fc;
      border: 1px solid #e8ecf4;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .users-table {
      background: white;
    }

    .users-table th {
      font-weight: 700;
      color: #1a1a1a;
      background: #f3f3f3;
    }

    .users-table td {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
    }

    .users-table tr:hover {
      background: #f9f9f9;
    }

    .role-chip-admin {
      background: #e3f2fd !important;
      color: #1565c0 !important;
      font-weight: 600;
    }

    .role-chip-customer {
      background: #e8f5e9 !important;
      color: #2e7d32 !important;
      font-weight: 600;
    }

    .role-chip-delivery_boy {
      background: #fff3e0 !important;
      color: #e65100 !important;
      font-weight: 600;
    }

    .status-active {
      color: #2e7d32;
      font-weight: 600;
    }

    .status-inactive {
      color: #c62828;
      font-weight: 600;
    }

    mat-form-field {
      width: 100%;
    }

    button[mat-icon-button] {
      width: 36px;
      height: 36px;
      line-height: 36px;
    }
  `]
})
export class AllUsersComponent implements OnInit {
  readonly users = signal<UserWithRoles[]>([]);
  readonly currentPage = signal(0);
  readonly totalPages = signal(1);
  readonly totalUsers = signal(0);
  readonly loading = signal(false);
  readonly columns = ['id', 'name', 'phone', 'roles', 'status', 'actions'];
  searchTerm = '';
  private isSearching = false;

  constructor(
    private api: ApiService,
    private snack: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(page = this.currentPage()): void {
    this.loading.set(true);
    this.isSearching = false;
    
    this.api.get<any>('/admin/users', { page, size: 20 }).subscribe({
      next: (res) => {
        this.currentPage.set(res.number ?? page);
        this.totalPages.set(res.totalPages || 1);
        this.totalUsers.set(res.totalElements || 0);
        this.users.set(res.content || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.snack.open('Failed to load users', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  search(): void {
    if (!this.searchTerm.trim()) {
      this.load();
      return;
    }

    this.loading.set(true);
    this.isSearching = true;

    this.api.get<any>('/admin/users/search', { query: this.searchTerm }).subscribe({
      next: (res) => {
        this.users.set(res || []);
        this.totalUsers.set(res.length || 0);
        this.currentPage.set(0);
        this.totalPages.set(1);
        this.loading.set(false);
      },
      error: (err) => {
        this.snack.open('Search failed', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  resetSearch(): void {
    this.searchTerm = '';
    this.load();
  }

  prevPage(): void {
    if (this.currentPage() === 0) return;
    this.load(this.currentPage() - 1);
  }

  nextPage(): void {
    if (this.currentPage() + 1 >= this.totalPages()) return;
    this.load(this.currentPage() + 1);
  }

  getRoleEmoji(role: string): string {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return '👨‍💼';
      case 'CUSTOMER':
        return '🛍️';
      case 'DELIVERY_BOY':
        return '🚴';
      default:
        return '👤';
    }
  }

  manageRoles(user: UserWithRoles): void {
    // Navigate to role management and pass phone as query param
    this.router.navigate(['/roles'], { queryParams: { phone: user.phone } });
  }

  toggleActive(user: UserWithRoles): void {
    this.loading.set(true);
    this.api.patch<any>(`/admin/users/${user.id}/active`, { active: !user.active }).subscribe({
      next: (res) => {
        user.active = res.active || !user.active;
        this.snack.open(
          `User ${user.active ? 'activated' : 'deactivated'}`,
          'Close',
          { duration: 2000 }
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.snack.open('Failed to update user status', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }
}

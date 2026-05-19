import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../../core/services/api.service';

interface RoleCheckbox {
  roleId: number;
  roleName: string;
  assigned: boolean;
}

interface UserRoles {
  userId: number;
  fullName: string;
  phone: string;
  active: boolean;
  roles: RoleCheckbox[];
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatCardModule
  ],
  template: `
    <h2 class="page-title">🔐 Role Management</h2>

    <!-- Search Section -->
    <section class="metric-card" style="margin-bottom:20px;">
      <div style="display:grid;grid-template-columns:1fr auto;gap:10px;">
        <mat-form-field appearance="outline" style="width:100%;">
          <mat-label>Search by Phone</mat-label>
          <input matInput [(ngModel)]="searchPhone" (keyup.enter)="search()" placeholder="Enter 10-digit phone number" />
        </mat-form-field>
        <button mat-flat-button color="primary" (click)="search()" [disabled]="loading() || searchPhone.length !== 10">
          🔍 Search
        </button>
      </div>
      <div class="error-banner" *ngIf="error()">{{ error() }}</div>
    </section>

    <!-- User Details & Role Assignment Section -->
    <section class="metric-card" *ngIf="user()">
      <mat-card style="padding:20px;">
        <!-- User Info -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;border-bottom:1px solid #e0e0e0;padding-bottom:20px;">
          <div>
            <p style="margin:0;color:#9e9e9e;font-size:12px;">Full Name</p>
            <h3 style="margin:5px 0 0;color:#1a1a1a;">{{ user()!.fullName }}</h3>
          </div>
          <div>
            <p style="margin:0;color:#9e9e9e;font-size:12px;">Phone</p>
            <h3 style="margin:5px 0 0;color:#1a1a1a;">{{ user()!.phone }}</h3>
          </div>
          <div>
            <p style="margin:0;color:#9e9e9e;font-size:12px;">User ID</p>
            <h3 style="margin:5px 0 0;color:#1a1a1a;">{{ user()!.userId }}</h3>
          </div>
          <div>
            <p style="margin:0;color:#9e9e9e;font-size:12px;">Status</p>
            <h3 style="margin:5px 0 0;color:#1ba672;">{{ user()!.active ? '✅ Active' : '❌ Inactive' }}</h3>
          </div>
        </div>

        <!-- Role Assignment Checkboxes -->
        <div style="margin-bottom:20px;">
          <p style="font-weight:600;margin-bottom:15px;color:#1a1a1a;">Assign Roles:</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:15px;">
            <mat-checkbox
              *ngFor="let role of user()!.roles"
              [checked]="role.assigned"
              (change)="toggleRole(role)"
              style="display:flex;align-items:center;">
              <span style="margin-left:8px;">
                <strong>{{ role.roleName }}</strong>
                <span *ngIf="role.assigned" style="margin-left:5px;color:#1ba672;">✓</span>
              </span>
            </mat-checkbox>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;gap:10px;margin-top:20px;">
          <button mat-flat-button color="primary" (click)="saveChanges()" [disabled]="loading() || !hasChanges()">
            💾 Save Changes
          </button>
          <button mat-button (click)="reset()" [disabled]="loading() || !hasChanges()">
            ↩️ Cancel
          </button>
        </div>

        <div class="success-banner" *ngIf="success()">{{ success() }}</div>
      </mat-card>
    </section>

    <!-- Empty State -->
    <section class="metric-card" *ngIf="!user() && !loading() && !error()">
      <p style="text-align:center;color:#9e9e9e;padding:40px;">
        🔍 Search for a user by phone number to manage their roles
      </p>
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

    .error-banner {
      background: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 6px;
      margin-top: 10px;
      font-size: 14px;
    }

    .success-banner {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 12px;
      border-radius: 6px;
      margin-top: 10px;
      font-size: 14px;
    }

    mat-checkbox {
      display: block;
      margin-bottom: 8px;
    }

    button {
      font-weight: 600;
    }
  `]
})
export class RoleManagementComponent {
  searchPhone = '';
  user = signal<UserRoles | null>(null);
  originalRoles = signal<Map<number, boolean>>(new Map());
  loading = signal(false);
  error = signal('');
  success = signal('');

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  search(): void {
    if (this.searchPhone.length !== 10) {
      this.error.set('Please enter a valid 10-digit phone number');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.api.get<any>('/admin/roles/user/search', { phone: this.searchPhone }).subscribe({
      next: (response) => {
        const data = response.data || response;
        this.user.set(data);
        // Store original roles state for comparison
        const originalState = new Map<number, boolean>();
        data.roles.forEach((role: RoleCheckbox) => {
          originalState.set(role.roleId, role.assigned);
        });
        this.originalRoles.set(originalState);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'User not found');
        this.user.set(null);
        this.loading.set(false);
      }
    });
  }

  toggleRole(role: RoleCheckbox): void {
    role.assigned = !role.assigned;
  }

  hasChanges(): boolean {
    const currentUser = this.user();
    if (!currentUser) return false;

    for (const role of currentUser.roles) {
      const originalState = this.originalRoles().get(role.roleId);
      if (originalState !== role.assigned) {
        return true;
      }
    }
    return false;
  }

  saveChanges(): void {
    const currentUser = this.user();
    if (!currentUser) return;

    const selectedRoleIds = currentUser.roles
      .filter(r => r.assigned)
      .map(r => r.roleId);

    this.loading.set(true);
    this.error.set('');

    this.api.post<any>(`/admin/roles/user/${currentUser.userId}`, { roleIds: selectedRoleIds }).subscribe({
      next: (response) => {
        const data = response.data || response;
        this.user.set(data);
        const originalState = new Map<number, boolean>();
        data.roles.forEach((role: RoleCheckbox) => {
          originalState.set(role.roleId, role.assigned);
        });
        this.originalRoles.set(originalState);
        this.success.set('✅ Roles updated successfully!');
        this.loading.set(false);
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to update roles');
        this.loading.set(false);
      }
    });
  }

  reset(): void {
    const currentUser = this.user();
    if (!currentUser) return;

    currentUser.roles.forEach(role => {
      role.assigned = this.originalRoles().get(role.roleId) || false;
    });
  }
}

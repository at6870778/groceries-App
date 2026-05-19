import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatListModule } from '@angular/material/list';
import { ActivatedRoute } from '@angular/router';
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
    FormsModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatCardModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatListModule
  ],
  template: `
    <h2 class="page-title">🔐 Role Management</h2>

    <!-- Search Section -->
    <section class="metric-card" style="margin-bottom:20px;">
      <div style="display:grid;grid-template-columns:1fr;gap:15px;">
        <!-- Name/Phone Search -->
        <mat-form-field appearance="outline" style="width:100%;">
          <mat-label>Search by Name or Phone</mat-label>
          <input 
            matInput 
            [(ngModel)]="searchInput" 
            (input)="onSearchInput($event)"
            (keyup.enter)="searchByInput()"
            placeholder="e.g., Admin or 8874329945"
            autocomplete="off" />
        </mat-form-field>

        <!-- Autocomplete Dropdown Results -->
        <div class="autocomplete-dropdown" *ngIf="showSuggestions() && suggestions().length > 0">
          <div class="autocomplete-item" 
            *ngFor="let suggestion of suggestions()" 
            (click)="selectFromSuggestions(suggestion)">
            <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
              <div>
                <strong>{{ suggestion.fullName }}</strong>
                <span style="color:#9e9e9e;font-size:12px;margin-left:8px;">{{ suggestion.phone }}</span>
              </div>
              <span style="color:#9e9e9e;font-size:12px;">ID: {{ suggestion.id }}</span>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:8px;">
          <button mat-flat-button color="primary" (click)="searchByInput()" [disabled]="loading() || !searchInput.trim()">
            🔍 Search
          </button>
          <button mat-button (click)="resetSearch()" [disabled]="loading() || !searchInput.trim()">
            ✕ Clear
          </button>
        </div>
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
        🔍 Search for a user by name or phone number to manage their roles
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
      position: relative;
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

    .autocomplete-dropdown {
      position: absolute;
      top: 120px;
      left: 20px;
      right: 20px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
    }

    .autocomplete-item {
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      transition: background-color 0.2s;
    }

    .autocomplete-item:hover {
      background-color: #f5f5f5;
    }

    .autocomplete-item:last-child {
      border-bottom: none;
    }
  `]
})
export class RoleManagementComponent implements OnInit {
  searchInput = '';
  user = signal<UserRoles | null>(null);
  originalRoles = signal<Map<number, boolean>>(new Map());
  loading = signal(false);
  error = signal('');
  success = signal('');
  allUsers = signal<any[]>([]);
  suggestions = signal<any[]>([]);
  showSuggestions = signal(false);

  constructor(
    private api: ApiService, 
    private snack: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check if phone is passed as query param from All Users page
    this.route.queryParams.subscribe(params => {
      if (params['phone']) {
        this.searchInput = params['phone'];
        // Auto-load the user after a small delay to ensure component is initialized
        setTimeout(() => this.searchByPhone(params['phone']), 100);
      }
    });

    // Load all users for autocomplete
    this.loadAllUsersForAutocomplete();
  }

  loadAllUsersForAutocomplete(): void {
    this.api.get<any>('/admin/users', { page: 0, size: 1000 }).subscribe({
      next: (res) => {
        this.allUsers.set(res.content || []);
      },
      error: (err) => {
        console.error('Failed to load users for autocomplete', err);
      }
    });
  }

  onSearchInput(event: any): void {
    const input = this.searchInput.trim().toLowerCase();
    
    if (input.length < 1) {
      this.showSuggestions.set(false);
      this.suggestions.set([]);
      return;
    }

    // Filter users based on name or phone starting with input
    const filtered = this.allUsers().filter(u => 
      u.fullName.toLowerCase().startsWith(input) || 
      u.phone.startsWith(input)
    ).slice(0, 8); // Show max 8 suggestions

    this.suggestions.set(filtered);
    this.showSuggestions.set(filtered.length > 0);
  }

  selectFromSuggestions(user: any): void {
    this.searchInput = user.phone;
    this.showSuggestions.set(false);
    this.suggestions.set([]);
    setTimeout(() => this.searchByPhone(user.phone), 50);
  }

  searchByInput(): void {
    const input = this.searchInput.trim();
    
    if (!input) {
      this.error.set('Please enter a name or phone number');
      return;
    }

    // If input looks like a phone (10 digits), search by phone
    if (/^\d{10}$/.test(input)) {
      this.searchByPhone(input);
    } else {
      // Search by name
      this.searchByName(input);
    }
  }

  private searchByPhone(phone: string): void {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    this.showSuggestions.set(false);

    this.api.get<any>('/admin/roles/user/search', { phone }).subscribe({
      next: (response) => {
        const data = response.data || response;
        this.user.set(data);
        this.storeOriginalRoles(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'User not found');
        this.user.set(null);
        this.loading.set(false);
      }
    });
  }

  private searchByName(name: string): void {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    this.showSuggestions.set(false);

    // Find user by name (case-insensitive)
    const matchedUser = this.allUsers().find(u => 
      u.fullName.toLowerCase().startsWith(name.toLowerCase())
    );

    if (matchedUser) {
      this.searchByPhone(matchedUser.phone);
    } else {
      this.error.set('User not found');
      this.user.set(null);
      this.loading.set(false);
    }
  }

  private storeOriginalRoles(data: UserRoles): void {
    const originalState = new Map<number, boolean>();
    data.roles.forEach((role: RoleCheckbox) => {
      originalState.set(role.roleId, role.assigned);
    });
    this.originalRoles.set(originalState);
  }

  search(): void {
    this.searchByInput();
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
        this.storeOriginalRoles(data);
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

    currentUser.roles.forEach((role: RoleCheckbox) => {
      role.assigned = this.originalRoles().get(role.roleId) || false;
    });
  }

  resetSearch(): void {
    this.searchInput = '';
    this.showSuggestions.set(false);
    this.suggestions.set([]);
    this.user.set(null);
    this.error.set('');
    this.success.set('');
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule
  ],
  template: `
    <h2 class="page-title">🛟 Support Contact Settings</h2>

    <mat-card style="max-width:700px;">
      <mat-card-content>
        <p class="subtitle">
          Manage support details shown in the customer app Account section.
          Changes are live after save and do not require app redeployment.
        </p>

        <mat-form-field appearance="outline" style="width:100%;margin-bottom:10px;">
          <mat-label>Support Phone Number</mat-label>
          <input matInput [(ngModel)]="form.phoneNumber" placeholder="e.g. +919876543210">
          <mat-error *ngIf="phoneError()">{{ phoneError() }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width:100%;margin-bottom:10px;">
          <mat-label>Support Email</mat-label>
          <input matInput [(ngModel)]="form.supportEmail" placeholder="support@orderkro.in">
          <mat-error *ngIf="supportEmailError()">{{ supportEmailError() }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width:100%;margin-bottom:10px;">
          <mat-label>Privacy Email</mat-label>
          <input matInput [(ngModel)]="form.privacyEmail" placeholder="privacy@orderkro.in">
          <mat-error *ngIf="privacyEmailError()">{{ privacyEmailError() }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width:100%;margin-bottom:14px;">
          <mat-label>Address</mat-label>
          <input matInput [(ngModel)]="form.addressLine" placeholder="Khanago, India">
        </mat-form-field>

        <div class="preview">
          <div class="preview-title">Live Preview</div>
          <a class="preview-link" [href]="'tel:' + form.phoneNumber">{{ form.phoneNumber || '-' }}</a>
          <a class="preview-link" [href]="'mailto:' + form.supportEmail">{{ form.supportEmail || '-' }}</a>
          <a class="preview-link" [href]="'mailto:' + form.privacyEmail">{{ form.privacyEmail || '-' }}</a>
          <div class="preview-meta">Address: {{ form.addressLine || '-' }}</div>
        </div>

        <div style="display:flex;gap:12px;margin-top:16px;">
          <button mat-flat-button color="primary" (click)="save()" [disabled]="saving() || !isFormValid()">
            {{ saving() ? 'Saving...' : '💾 Save Support Details' }}
          </button>
          <button mat-stroked-button (click)="load()" [disabled]="saving()">↻ Reload</button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-title { margin-bottom: 20px; }
    .subtitle { color: #5b6470; margin-bottom: 18px; }
    .preview {
      background: #f7faf9;
      border: 1px solid #dbe5df;
      border-radius: 10px;
      padding: 12px;
    }
    .preview-title {
      font-size: 12px;
      font-weight: 700;
      color: #4d5a53;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }
    .preview-link {
      display: block;
      text-decoration: none;
      color: #1f5cb4;
      font-weight: 700;
      margin-bottom: 6px;
      word-break: break-word;
    }
    .preview-meta {
      color: #5b6470;
      font-size: 13px;
    }
  `]
})
export class SupportContactComponent implements OnInit {
  readonly saving = signal(false);

  form = {
    phoneNumber: '',
    supportEmail: '',
    privacyEmail: '',
    addressLine: ''
  };

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  private readonly phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.api.get<any>('/admin/support-contact').subscribe({
      next: (res) => {
        this.form.phoneNumber = (res?.phoneNumber || '').trim();
        this.form.supportEmail = (res?.supportEmail || '').trim();
        this.form.privacyEmail = (res?.privacyEmail || '').trim();
        this.form.addressLine = (res?.addressLine || '').trim();
      },
      error: () => this.snack.open('Failed to load support settings', '', { duration: 2500 })
    });
  }

  save() {
    if (!this.isFormValid()) {
      this.snack.open('Please fix validation errors before saving', '', { duration: 2500 });
      return;
    }
    this.saving.set(true);
    this.api.put('/admin/support-contact', {
      phoneNumber: this.form.phoneNumber.trim(),
      supportEmail: this.form.supportEmail.trim(),
      privacyEmail: this.form.privacyEmail.trim(),
      addressLine: this.form.addressLine.trim()
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Support details updated', '', { duration: 2500 });
      },
      error: () => {
        this.saving.set(false);
        this.snack.open('Failed to update support details', '', { duration: 3000 });
      }
    });
  }

  phoneError(): string {
    const value = this.form.phoneNumber.trim();
    if (!value) return 'Phone number is required';
    if (!this.phoneRegex.test(value)) return 'Enter a valid phone number';
    return '';
  }

  supportEmailError(): string {
    const value = this.form.supportEmail.trim();
    if (!value) return 'Support email is required';
    if (!this.emailRegex.test(value)) return 'Enter a valid support email';
    return '';
  }

  privacyEmailError(): string {
    const value = this.form.privacyEmail.trim();
    if (!value) return 'Privacy email is required';
    if (!this.emailRegex.test(value)) return 'Enter a valid privacy email';
    return '';
  }

  isFormValid(): boolean {
    return !this.phoneError() && !this.supportEmailError() && !this.privacyEmailError();
  }
}

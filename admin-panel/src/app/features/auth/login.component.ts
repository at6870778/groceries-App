import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatInputModule, MatButtonModule],
  styles: [`
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 16px; }
    mat-card { width: min(460px, 100%); border-radius: 20px; }
    .title { font-family: "Fraunces", serif; margin-bottom: 12px; }
    .grid { display: grid; gap: 12px; }
    .error { background: #f8d7da; color: #721c24; padding: 12px; border-radius: 4px; margin-bottom: 12px; font-size: 0.9em; }
    .info { background: #d1ecf1; color: #0c5460; padding: 12px; border-radius: 4px; margin-bottom: 12px; font-size: 0.9em; }
  `],
  template: `
    <section class="wrap">
      <mat-card>
        <mat-card-content>
          <h2 class="title">Admin Login</h2>
          <div *ngIf="error()" class="error">{{ error() }}</div>
          <div *ngIf="loading()" class="info">⏳ {{ loadingMsg() }}</div>
          <form [formGroup]="form" (ngSubmit)="submit()" class="grid" [attr.disabled]="loading()">
            <mat-form-field appearance="outline">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="phone" placeholder="9999999991" [disabled]="loading()" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Full Name</mat-label>
              <input matInput formControlName="fullName" placeholder="Admin User" [disabled]="loading()" />
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit" [disabled]="loading() || form.invalid">
              {{ loading() ? '⏳ Logging in...' : '🔐 Login with OTP' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </section>
  `
})
export class LoginComponent {
  readonly form = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    fullName: ['', Validators.required]
  });
  readonly error = signal('');
  readonly loading = signal(false);
  readonly loadingMsg = signal('');

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  submit() {
    if (this.form.invalid) {
      this.error.set('Phone must be 10 digits and full name is required');
      return;
    }
    const { phone, fullName } = this.form.getRawValue();
    this.loading.set(true);
    this.loadingMsg.set('Logging in (dev mode - OTP bypass)...');
    this.error.set('');
    
    // In dev mode, skip OTP request and go directly to verify-otp with any code
    // The backend dev bypass will accept it
    this.auth.login(phone!, fullName!).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.auth.saveSession(res.data);
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Login failed: ' + (err.error?.message || err.message || 'Unknown error'));
        console.error('Login error:', err);
      }
    });
  }
}

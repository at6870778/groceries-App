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
          <div *ngIf="success()" class="info">✅ {{ success() }}</div>
          <div *ngIf="loading()" class="info">⏳ {{ loadingMsg() }}</div>
          
          <form [formGroup]="form" class="grid" [attr.disabled]="loading()">
            <!-- Step 1: Phone & Name (always visible) -->
            <mat-form-field appearance="outline">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="phone" placeholder="9999999991" [disabled]="loading() || otpSent()" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Full Name</mat-label>
              <input matInput formControlName="fullName" placeholder="Admin User" [disabled]="loading() || otpSent()" />
            </mat-form-field>

            <!-- Step 2: OTP (shown after request sent) -->
            <mat-form-field appearance="outline" *ngIf="otpSent()">
              <mat-label>OTP</mat-label>
              <input matInput formControlName="otp" placeholder="Enter 6-digit OTP" [disabled]="loading()" />
            </mat-form-field>

            <!-- Action Buttons -->
            <div style="display: grid; gap: 8px;">
              <button mat-flat-button color="primary" type="button" (click)="sendOtp()" [disabled]="loading() || form.get('phone')?.invalid || form.get('fullName')?.invalid || otpSent()" *ngIf="!otpSent()">
                ✉️ Request OTP
              </button>
              
              <button mat-flat-button color="primary" type="button" (click)="verifyOtpClick()" [disabled]="loading() || form.get('otp')?.invalid" *ngIf="otpSent()">
                🔐 Verify OTP
              </button>

              <button mat-button type="button" color="accent" (click)="resendOtp()" [disabled]="loading() || resendSeconds() > 0" *ngIf="otpSent()">
                {{ resendSeconds() > 0 ? 'Resend OTP in ' + resendSeconds() + 's' : '🔄 Resend OTP' }}
              </button>

              <button mat-button type="button" color="warn" (click)="resetForm()" [disabled]="loading()" *ngIf="otpSent()">
                ← Change Phone
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </section>
  `
})
export class LoginComponent {
  readonly form = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    fullName: ['', Validators.required],
    otp: ['', [Validators.required, Validators.minLength(4)]]
  });
  readonly error = signal('');
  readonly success = signal('');
  readonly loading = signal(false);
  readonly loadingMsg = signal('');
  readonly otpSent = signal(false);
  private requestId = '';
  private resendTimeout = 30;
  readonly resendSeconds = signal(0);

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  sendOtp() {
    const phone = this.form.get('phone')?.value;
    if (!phone || phone.length !== 10) {
      this.error.set('Please enter a valid 10-digit phone number');
      return;
    }
    this.clearStatus();
    this.loading.set(true);
    this.loadingMsg.set('Sending OTP...');

    this.auth.requestOtp(phone).subscribe({
      next: (res) => {
        this.requestId = res.data;
        this.otpSent.set(true);
        this.startResendCountdown();
        this.success.set('OTP sent to ' + phone + '. Please check your phone.');
        this.loading.set(false);
        this.loadingMsg.set('');
      },
      error: (err) => {
        this.loading.set(false);
        this.loadingMsg.set('');
        this.error.set('OTP request failed: ' + (err.error?.message || err.message || 'Unknown error'));
        console.error('OTP request error:', err);
      }
    });
  }

  verifyOtpClick() {
    const phone = this.form.get('phone')?.value;
    const fullName = this.form.get('fullName')?.value;
    const otp = this.form.get('otp')?.value;

    if (!phone || !fullName || !otp) {
      this.error.set('Please fill in all fields');
      return;
    }

    this.clearStatus();
    this.loading.set(true);
    this.loadingMsg.set('Verifying OTP...');

    this.auth.login(phone, fullName, otp, this.requestId || undefined).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.loadingMsg.set('');
        this.auth.saveSession(res.data);
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        this.loadingMsg.set('');
        this.error.set('Login failed: ' + (err.error?.message || err.message || 'Unknown error'));
        console.error('Login error:', err);
      }
    });
  }

  resetForm() {
    this.otpSent.set(false);
    this.requestId = '';
    this.form.get('otp')?.reset();
    this.clearStatus();
    this.resendSeconds.set(0);
  }

  resendOtp() {
    if (!this.otpSent() || this.resendSeconds() > 0 || this.loading()) {
      return;
    }
    const phone = this.form.get('phone')?.value;
    if (!phone) {
      this.error.set('Phone number is required to resend OTP');
      return;
    }

    this.clearStatus();
    this.loading.set(true);
    this.loadingMsg.set('Resending OTP...');

    const request$ = this.requestId
      ? this.auth.retryOtp(phone, this.requestId)
      : this.auth.requestOtp(phone);

    request$.subscribe({
      next: (res) => {
        this.requestId = res.data;
        this.otpSent.set(true);
        this.startResendCountdown();
        this.success.set('OTP resent. Please check your phone.');
        this.loading.set(false);
        this.loadingMsg.set('');
      },
      error: (err) => {
        this.loading.set(false);
        this.loadingMsg.set('');
        this.error.set('Resend failed: ' + (err.error?.message || err.message || 'Unknown error'));
        console.error('Resend error:', err);
      }
    });
  }

  private startResendCountdown() {
    this.resendSeconds.set(this.resendTimeout);
    const interval = window.setInterval(() => {
      this.resendSeconds.update(current => {
        const next = current - 1;
        if (next <= 0) {
          window.clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  private clearStatus() {
    this.error.set('');
    this.success.set('');
  }
}

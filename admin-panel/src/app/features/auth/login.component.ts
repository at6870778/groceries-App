import { Component } from '@angular/core';
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
  `],
  template: `
    <section class="wrap">
      <mat-card>
        <mat-card-content>
          <h2 class="title">Admin Login</h2>
          <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
            <mat-form-field appearance="outline">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="phone" placeholder="9876543210" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Full Name</mat-label>
              <input matInput formControlName="fullName" placeholder="Admin User" />
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit">Login with OTP Simulation</button>
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

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  submit() {
    if (this.form.invalid) return;
    const { phone, fullName } = this.form.getRawValue();
    this.auth.requestOtp(phone!).subscribe(() => {
      this.auth.login(phone!, fullName!).subscribe((res) => {
        this.auth.saveSession(res.data);
        this.router.navigateByUrl('/dashboard');
      });
    });
  }
}

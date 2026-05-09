import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonInput, IonItem, IonButton, IonText } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, NgIf, IonContent, IonHeader, IonTitle, IonToolbar, IonInput, IonItem, IonButton, IonText],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Welcome to Order Kro</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <h2>Login with OTP</h2>
      <ion-item>
        <ion-input label="Phone (10 digits)" labelPlacement="stacked"
          [(ngModel)]="phone" type="tel" maxlength="10"></ion-input>
      </ion-item>
      <ion-text color="danger" *ngIf="error">
        <p style="padding: 0 16px;">{{ error }}</p>
      </ion-text>
      <ion-item>
        <ion-input label="Name" labelPlacement="stacked" [(ngModel)]="fullName"></ion-input>
      </ion-item>
      <ion-button expand="block" (click)="login()" [disabled]="loading">{{ loading ? 'Please wait...' : 'Continue' }}</ion-button>
    </ion-content>
  `
})
export class LoginPage {
  phone = '';
  fullName = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.error = '';
    if (!/^[0-9]{10}$/.test(this.phone)) {
      this.error = 'Please enter a valid 10-digit phone number.';
      return;
    }
    if (!this.fullName.trim()) {
      this.error = 'Please enter your name.';
      return;
    }
    this.loading = true;
    this.auth.requestOtp(this.phone).subscribe({
      next: () => {
        this.auth.login(this.phone, this.fullName).subscribe({
          next: (res) => {
            this.auth.saveToken(res.data.token, 'CUSTOMER');
            this.loading = false;
            this.router.navigateByUrl('/home');
          },
          error: () => { this.error = 'Login failed. Try again.'; this.loading = false; }
        });
      },
      error: () => { this.error = 'Could not send OTP. Check your connection.'; this.loading = false; }
    });
  }
}

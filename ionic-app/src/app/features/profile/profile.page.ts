import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButton],
  template: `
    <ion-header><ion-toolbar><ion-title>Profile</ion-title></ion-toolbar></ion-header>
    <ion-content [scrollEvents]="true" [fullscreen]="false" class="ion-padding">
      <h2>{{ profile()?.fullName }}</h2>
      <p>{{ profile()?.phone }}</p>
      <ion-button expand="block" color="danger" (click)="logout()">Logout</ion-button>
    </ion-content>
  `
})
export class ProfilePage implements OnInit, OnDestroy {
  readonly profile = signal<any | null>(null);
  private destroy$ = new Subject<void>();

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    this.api.get('/customer/profile')
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => this.profile.set(res));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout() {
    this.auth.clearTokens();
    window.location.href = '/';
  }
}

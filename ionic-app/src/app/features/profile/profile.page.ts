import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ActivityState } from '../../core/state/activity.state';

@Component({
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonList, IonItem, IonLabel],
  template: `
    <ion-header><ion-toolbar><ion-title>Profile</ion-title></ion-toolbar></ion-header>
    <ion-content [scrollEvents]="true" [fullscreen]="false" class="ion-padding">
      <h2>{{ profile()?.fullName }}</h2>
      <p>{{ profile()?.phone }}</p>

      <div style="margin: 18px 0 10px; display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Recent Activity</h3>
        <ion-button size="small" fill="outline" color="medium" (click)="clearActivities()" [disabled]="activityState.items().length === 0">
          Clear All
        </ion-button>
      </div>

      <ion-list *ngIf="activityState.items().length > 0; else noActivity">
        <ion-item *ngFor="let act of activityState.items().slice(0, 25)">
          <ion-label>
            <h3>{{ act.message }}</h3>
            <p>{{ act.timestamp | date:'medium' }}</p>
          </ion-label>
          <ion-button slot="end" size="small" fill="clear" color="danger" (click)="removeActivity(act.id)">Remove</ion-button>
        </ion-item>
      </ion-list>

      <ng-template #noActivity>
        <p style="color:#6f7f95; margin-top:4px;">No activity yet.</p>
      </ng-template>

      <ion-button expand="block" color="danger" (click)="logout()">Logout</ion-button>
    </ion-content>
  `
})
export class ProfilePage implements OnInit, OnDestroy {
  readonly profile = signal<any | null>(null);
  private destroy$ = new Subject<void>();

  constructor(private api: ApiService, private auth: AuthService, public activityState: ActivityState) {}

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

  removeActivity(id: string) {
    this.activityState.remove(id);
  }

  clearActivities() {
    this.activityState.clear();
  }
}

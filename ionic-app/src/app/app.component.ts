import { Component, effect } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { SyncService } from './core/services/sync.service';
import { AuthService } from './core/services/auth.service';
import { PushNotificationService } from './core/services/push-notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `
})
export class AppComponent {
  constructor(
    private sync: SyncService,
    private auth: AuthService,
    private push: PushNotificationService
  ) {
    this.sync.init();

    // Initialize push notifications whenever the user becomes a logged-in customer
    effect(() => {
      const role = this.auth.activeRole();
      const token = this.auth.customerToken();
      if (role === 'CUSTOMER' && token) {
        this.push.init();
      }
    });
  }
}

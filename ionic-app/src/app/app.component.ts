import { Component, effect, OnInit, OnDestroy } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Router, NavigationEnd } from '@angular/router';
import { App } from '@capacitor/app';
import { SyncService } from './core/services/sync.service';
import { AuthService } from './core/services/auth.service';
import { PushNotificationService } from './core/services/push-notification.service';
import { filter } from 'rxjs/operators';

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
export class AppComponent implements OnInit, OnDestroy {
  private currentUrl = '/home';
  private backButtonListener: any;

  constructor(
    private sync: SyncService,
    private auth: AuthService,
    private push: PushNotificationService,
    private router: Router
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

  ngOnInit() {
    // Track current route
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => { this.currentUrl = e.urlAfterRedirects; });

    // Handle Android hardware back button
    this.backButtonListener = App.addListener('backButton', () => {
      const isHome = this.currentUrl === '/home' || this.currentUrl === '/';
      if (isHome) {
        // On home screen → minimize app (go to phone home screen, don't close)
        App.minimizeApp();
      }
      // On any other screen → do nothing; Ionic/Angular handles navigation back naturally
    });
  }

  ngOnDestroy() {
    this.backButtonListener?.remove();
  }
}

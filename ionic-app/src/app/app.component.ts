import { Component, effect, OnInit, OnDestroy, NgZone } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
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
      <div class="exit-toast" [class.visible]="showExitToast">
        <img src="assets/orderkro-logo.png" class="exit-logo" alt="OrderKro">
        <span>Press again to exit</span>
      </div>
    </ion-app>
  `,
  styles: [`
    .exit-toast {
      position: fixed;
      bottom: 90px;
      left: 16px;
      right: 16px;
      max-width: 320px;
      margin: 0 auto;
      transform: translateY(20px);
      background: rgba(20, 20, 20, 0.92);
      color: #fff;
      padding: 10px 18px 10px 12px;
      border-radius: 32px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
      z-index: 99999;
      white-space: normal;
      word-break: keep-all;
      box-shadow: 0 4px 20px rgba(0,0,0,0.35);
    }
    .exit-toast.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .exit-logo {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      object-fit: contain;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private exitPressedOnce = false;
  private exitTimer: any;
  showExitToast = false;
  private currentUrl = '/home';
  private backHandler!: (e: Event) => void;

  private readonly ROOT_PAGES = ['/home', '/', '/login', '/delivery/orders'];

  constructor(
    private sync: SyncService,
    private auth: AuthService,
    private push: PushNotificationService,
    private router: Router,
    private location: Location,
    private zone: NgZone
  ) {
    this.sync.init();

    effect(() => {
      const role = this.auth.activeRole();
      const token = this.auth.customerToken();
      if (role === 'CUSTOMER' && token) {
        this.push.init();
      }
    });
  }

  ngOnInit() {
    this.currentUrl = this.router.url;
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => { this.currentUrl = e.urlAfterRedirects; });

    // Listen to the native DOM event dispatched by MainActivity.java
    this.backHandler = () => {
      this.zone.run(() => {
        // Use live router.url as fallback in case currentUrl wasn't updated yet
        const url = this.currentUrl || this.router.url || '';
        const cleanUrl = url.split('?')[0].split('#')[0];
        const isRoot = this.ROOT_PAGES.includes(cleanUrl);

        if (!isRoot) {
          this.location.back();
          return;
        }

        if (this.exitPressedOnce) {
          clearTimeout(this.exitTimer);
          this.showExitToast = false;
          App.minimizeApp();
          return;
        }

        this.exitPressedOnce = true;
        this.showExitToast = true;
        this.exitTimer = setTimeout(() => {
          this.exitPressedOnce = false;
          this.showExitToast = false;
        }, 2500);
      });
    };

    window.addEventListener('androidBackButton', this.backHandler);
  }

  ngOnDestroy() {
    window.removeEventListener('androidBackButton', this.backHandler);
    clearTimeout(this.exitTimer);
  }
}

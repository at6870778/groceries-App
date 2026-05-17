import { Component, effect, OnInit, OnDestroy, NgZone, signal } from '@angular/core';
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

      <!-- Persistent offline banner -->
      <div class="offline-banner" [class.visible]="isOffline()">
        <span class="offline-icon">📡</span>
        <div class="offline-text">
          <strong>No internet connection</strong>
          <span>Turn on Wi-Fi or mobile data</span>
        </div>
      </div>

      <!-- Brief "back online" confirmation -->
      <div class="online-banner" [class.visible]="backOnline()">
        <span>✓&nbsp; Back online</span>
      </div>

      <!-- Back-press exit hint -->
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

    /* ── Offline banner ── */
    .offline-banner {
      position: fixed;
      bottom: calc(68px + env(safe-area-inset-bottom, 0px));
      left: 12px;
      right: 12px;
      background: #1a1a1a;
      color: #fff;
      border-radius: 14px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.35);
      opacity: 0;
      transform: translateY(16px);
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      z-index: 99998;
    }
    .offline-banner.visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
    .offline-icon {
      font-size: 1.4rem;
      flex-shrink: 0;
    }
    .offline-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .offline-text strong {
      font-size: 0.88rem;
      font-weight: 700;
      line-height: 1.3;
    }
    .offline-text span {
      font-size: 0.76rem;
      color: #ccc;
      line-height: 1.3;
    }

    /* ── Back-online banner ── */
    .online-banner {
      position: fixed;
      bottom: calc(68px + env(safe-area-inset-bottom, 0px));
      left: 12px;
      right: 12px;
      background: #1b8a4e;
      color: #fff;
      border-radius: 14px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.88rem;
      font-weight: 600;
      box-shadow: 0 4px 24px rgba(0,0,0,0.25);
      opacity: 0;
      transform: translateY(16px);
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      z-index: 99998;
    }
    .online-banner.visible {
      opacity: 1;
      transform: translateY(0);
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private exitPressedOnce = false;
  private exitTimer: any;
  private onlineTimer: any;
  showExitToast = false;
  isOffline = signal(false);
  backOnline = signal(false);
  private currentUrl = '/home';
  private backHandler!: (e: Event) => void;
  private offlineHandler = () => this.zone.run(() => {
    this.isOffline.set(true);
    this.backOnline.set(false);
    clearTimeout(this.onlineTimer);
  });
  private onlineHandler = () => this.zone.run(() => {
    this.isOffline.set(false);
    this.backOnline.set(true);
    clearTimeout(this.onlineTimer);
    this.onlineTimer = setTimeout(() => this.backOnline.set(false), 3000);
  });

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

    // Set initial offline state and listen for changes
    this.isOffline.set(!navigator.onLine);
    window.addEventListener('offline', this.offlineHandler);
    window.addEventListener('online', this.onlineHandler);

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
    window.removeEventListener('offline', this.offlineHandler);
    window.removeEventListener('online', this.onlineHandler);
    clearTimeout(this.exitTimer);
    clearTimeout(this.onlineTimer);
  }
}

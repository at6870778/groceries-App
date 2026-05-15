import { Component, effect, OnInit, OnDestroy } from '@angular/core';
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
      <!-- Exit toast overlay -->
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
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: rgba(20, 20, 20, 0.92);
      color: #fff;
      padding: 10px 22px 10px 14px;
      border-radius: 32px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: 0.2px;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
      z-index: 99999;
      white-space: nowrap;
      box-shadow: 0 4px 20px rgba(0,0,0,0.35);
    }
    .exit-toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
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
  private currentUrl = '/home';
  private backButtonListener: any;
  private exitPressedOnce = false;
  private exitTimer: any;
  showExitToast = false;

  // Pages that are "root" tabs — back should not pop navigation
  private readonly ROOT_PAGES = ['/home', '/', '/login', '/delivery/orders'];

  constructor(
    private sync: SyncService,
    private auth: AuthService,
    private push: PushNotificationService,
    private router: Router,
    private location: Location
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
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => { this.currentUrl = e.urlAfterRedirects; });

    this.backButtonListener = App.addListener('backButton', () => {
      const isRoot = this.ROOT_PAGES.some(p => this.currentUrl === p || this.currentUrl.startsWith(p + '?'));

      if (!isRoot) {
        // Not on a root page — go back in navigation stack
        this.location.back();
        return;
      }

      // On home/root page — show "Press again to exit" toast
      if (this.exitPressedOnce) {
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
  }

  ngOnDestroy() {
    this.backButtonListener?.remove();
    clearTimeout(this.exitTimer);
  }
}

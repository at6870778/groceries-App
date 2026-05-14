import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { ToastController } from '@ionic/angular/standalone';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);

  /**
   * Call once after the user has successfully logged in as CUSTOMER.
   * Requests permission, gets the FCM token and registers it with the backend.
   */
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Push notifications only work on real Android/iOS devices
      return;
    }

    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission denied.');
      return;
    }

    // Create notification channels with IMPORTANCE_HIGH so screen wakes up
    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: 'khanago_orders',
        name: 'Order Updates',
        description: 'Order status notifications',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#FF5722'
      });
      await PushNotifications.createChannel({
        id: 'khanago_promos',
        name: 'Promotions',
        description: 'Promotional offers and announcements',
        importance: 4,
        visibility: 1,
        sound: 'default',
        vibration: true
      });
    }

    await PushNotifications.register();

    // On token received — send to backend
    PushNotifications.addListener('registration', (token: Token) => {
      this.registerTokenWithBackend(token.value);
    });

    // Foreground notification — show as an in-app toast
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      this.showToast(notification.title ?? 'Khanago', notification.body ?? '');
    });

    // Notification tapped (background/killed)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      const clickAction = action.notification.data?.['click_action'];
      this.handleClickAction(clickAction);
    });
  }

  private registerTokenWithBackend(token: string): void {
    this.api.post<void>('/customer/profile/fcm-token', { token }).subscribe({
      error: (e) => console.error('Failed to register FCM token:', e)
    });
  }

  private handleClickAction(action: string | undefined): void {
    if (action === 'OPEN_ORDERS') {
      this.router.navigate(['/orders']);
    } else if (action === 'OPEN_PROMOTIONS') {
      this.router.navigate(['/home']);
    }
  }

  private async showToast(title: string, body: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      header: title,
      message: body,
      duration: 4000,
      position: 'top',
      color: 'dark',
      buttons: [{ icon: 'close', role: 'cancel' }]
    });
    await toast.present();
  }
}

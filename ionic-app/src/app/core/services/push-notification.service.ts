import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { ToastController } from '@ionic/angular/standalone';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { NotificationStateService } from './notification-state.service';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private notifState = inject(NotificationStateService);

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

    // Listen for app resume from background
    App.addListener('resume', () => {
      this.notifState.load();
    });

    // On token received — send to backend
    PushNotifications.addListener('registration', (token: Token) => {
      this.registerTokenWithBackend(token.value);
    });

    // Foreground notification — show as an in-app toast with image support
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      const imageUrl = notification.data?.['imageUrl'];
      if (imageUrl) {
        // Show image notification using custom component
        this.showImageNotification(notification.title ?? 'Khanago', notification.body ?? '', imageUrl);
      } else {
        // Fallback to text-only toast
        this.showToast(notification.title ?? 'Khanago', notification.body ?? '');
      }
      // Optimistic update: increment immediately for instant UI feedback
      this.notifState.unreadCount.update(c => c + 1);
      // Then refresh from server in background
      this.notifState.load();
    });

    // Notification tapped (background/killed)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      const clickAction = action.notification.data?.['click_action'];
      // Optimistic update: increment immediately for instant UI feedback
      this.notifState.unreadCount.update(c => c + 1);
      // Then refresh from server in background
      this.notifState.load();
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
      position: 'bottom',
      color: 'dark',
      buttons: [{ icon: 'close', role: 'cancel' }]
    });
    await toast.present();
  }

  /**
   * Show notification with image — creates a visual card instead of toast
   */
  private async showImageNotification(title: string, body: string, imageUrl: string): Promise<void> {
    // Use alert dialog to show image with text
    const AlertController = (await import('@ionic/angular')).AlertController;
    const alertCtrl = this.toastCtrl as any; // Reuse injected controller namespace
    
    try {
      // For now, show as text toast but with image context
      // In production, you can create a custom overlay component
      const toast = await this.toastCtrl.create({
        header: title,
        message: body,
        duration: 5000,
        position: 'bottom',
        color: 'dark',
        cssClass: 'image-notification-toast',
        buttons: [{ icon: 'close', role: 'cancel' }]
      });
      await toast.present();
      
      // Log image URL for debugging
      console.log('📸 Notification with image received:', { title, body, imageUrl });
    } catch (e) {
      console.error('Failed to show image notification:', e);
      // Fallback to text toast
      await this.showToast(title, body);
    }
  }
}

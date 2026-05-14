import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationStateService {
  private api = inject(ApiService);

  notifications = signal<AppNotification[]>([]);
  unreadCount = signal<number>(0);

  load(): void {
    this.api.get<AppNotification[]>('/customer/notifications').subscribe({
      next: (data) => {
        this.notifications.set(data);
        this.unreadCount.set(data.filter(n => !n.read).length);
      },
      error: () => {}
    });
  }

  markRead(id: number): void {
    this.api.patch<void>(`/customer/notifications/${id}/read`, {}).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(n => n.id === id ? { ...n, read: true } : n)
        );
        this.unreadCount.update(c => Math.max(0, c - 1));
      }
    });
  }

  markAllRead(): void {
    this.api.patch<void>('/customer/notifications/read-all', {}).subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, read: true })));
        this.unreadCount.set(0);
      }
    });
  }
}

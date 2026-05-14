import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  type: string;
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
        this.unreadCount.set(data.length);
      },
      error: () => {}
    });
  }

  /** Delete on tap — removes from DB and local list immediately */
  deleteOne(id: number): void {
    this.api.delete<void>(`/customer/notifications/${id}`).subscribe({
      next: () => {
        this.notifications.update(list => list.filter(n => n.id !== id));
        this.unreadCount.update(c => Math.max(0, c - 1));
      }
    });
  }

  /** Clear all */
  deleteAll(): void {
    this.api.delete<void>('/customer/notifications').subscribe({
      next: () => {
        this.notifications.set([]);
        this.unreadCount.set(0);
      }
    });
  }
}

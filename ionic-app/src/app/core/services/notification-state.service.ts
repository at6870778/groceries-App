import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  type: string;
  imageUrl?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationStateService {
  private api = inject(ApiService);

  notifications = signal<AppNotification[]>([]);
  unreadCount = signal<number>(0);

  load(): void {
    // ✅ Clear old notifications first to prevent duplicates on re-login
    this.notifications.set([]);
    this.unreadCount.set(0);
    
    this.api.get<AppNotification[]>('/customer/notifications').subscribe({
      next: (data) => {
        this.notifications.set(data); // Replace, don't append
        this.unreadCount.set(data.length);
        console.log('✅ Notifications loaded:', data.length);
      },
      error: () => {
        console.warn('⚠️ Failed to load notifications');
      }
    });
  }

  /** Clear all notifications (called on logout) */
  clear(): void {
    console.log('🗑️ Clearing all notifications');
    this.notifications.set([]);
    this.unreadCount.set(0);
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

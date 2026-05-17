import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular/standalone';
import { NotificationStateService, AppNotification } from '../../core/services/notification-state.service';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, BottomNavComponent],
  template: `
    <ion-header>
      <ion-toolbar class="notif-toolbar">
        <div class="notif-header">
          <div class="header-title-group">
            <h1 class="header-title">Notifications</h1>
            <span class="header-sub" *ngIf="state.unreadCount() > 0">{{ state.unreadCount() }} new</span>
          </div>
          <button class="read-all-btn" *ngIf="state.notifications().length > 0" (click)="clearAll()">
            Clear all
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="notif-content">

      <!-- Empty state -->
      <div class="empty-state" *ngIf="state.notifications().length === 0">
        <div class="empty-orb">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <p class="empty-title">All caught up!</p>
        <p class="empty-sub">No notifications yet. We'll buzz you when something happens.</p>
      </div>

      <!-- Notification list -->
      <div class="notif-list" *ngIf="state.notifications().length > 0">
        <div
          *ngFor="let n of state.notifications(); trackBy: trackById"
          class="notif-card"
          (click)="onTap(n)"
        >
          <!-- Icon orb -->
          <div class="notif-orb" [ngClass]="orbClass(n.type)">
            <span class="notif-emoji">{{ notifEmoji(n.type, n.title) }}</span>
          </div>

          <!-- Content -->
          <div class="notif-body">
            <p class="notif-title">{{ n.title }}</p>
            <img *ngIf="n.imageUrl" class="notif-image" [src]="n.imageUrl" [alt]="n.title">
            <p class="notif-msg">{{ n.body }}</p>
            <span class="notif-time">{{ timeAgo(n.createdAt) }}</span>
          </div>

          <!-- Unread dot (always shown — tapping deletes) -->
          <div class="unread-dot"></div>
        </div>
      </div>

    </ion-content>

    <app-bottom-nav></app-bottom-nav>
  `,
  styles: [`
    :host { display: block; }

    /* ── Header ── */
    .notif-toolbar {
      --background: #fff;
      --border-color: transparent;
      box-shadow: 0 2px 12px rgba(102,126,234,0.08);
    }
    .notif-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
    }
    .header-title-group { flex: 1; }
    .header-title {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 0;
    }
    .header-sub {
      font-size: 12px;
      font-weight: 600;
      color: #667eea;
      background: #f0f0ff;
      padding: 2px 8px;
      border-radius: 20px;
      display: inline-block;
      margin-top: 2px;
    }
    .read-all-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      border: none;
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    /* ── Content ── */
    .notif-content { --background: #f7f8ff; }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 32px;
      gap: 12px;
      text-align: center;
    }
    .empty-orb {
      width: 88px; height: 88px;
      background: linear-gradient(135deg, #f0f0ff, #e8e0ff);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 8px;
      animation: float 3s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    .empty-title {
      font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0;
    }
    .empty-sub {
      font-size: 14px; color: #888; line-height: 1.5; margin: 0;
    }

    /* ── List ── */
    .notif-list {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* ── Card ── */
    .notif-card {
      background: #fff;
      border-radius: 16px;
      padding: 14px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      box-shadow: 0 2px 10px rgba(102,126,234,0.07);
      border-left: 3px solid #667eea;
      position: relative;
      transition: transform 0.15s, box-shadow 0.15s;
      cursor: pointer;
    }
    .notif-card:active {
      transform: scale(0.98);
    }

    /* ── Orb ── */
    .notif-orb {
      width: 44px; height: 44px;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      font-size: 20px;
    }
    .notif-orb.order   { background: linear-gradient(135deg, #fff3e0, #ffe0b2); }
    .notif-orb.promo   { background: linear-gradient(135deg, #e8f5e9, #c8e6c9); }
    .notif-orb.default { background: linear-gradient(135deg, #f0f0ff, #e8e0ff); }

    /* ── Body ── */
    .notif-body { flex: 1; min-width: 0; }
    .notif-image {
      width: 100%;
      max-height: 168px;
      object-fit: cover;
      border-radius: 12px;
      display: block;
      margin: 0 0 8px;
      background: #f2f4f8;
      border: 1px solid #eef1f6;
    }
    .notif-title {
      font-size: 14px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 0 0 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
        'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
    }
    .notif-msg {
      font-size: 13px;
      color: #555;
      margin: 0 0 5px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
        'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
    }
    .notif-time {
      font-size: 11px;
      color: #aaa;
      font-weight: 500;
    }

    /* ── Unread dot ── */
    .unread-dot {
      width: 8px; height: 8px;
      background: #667eea;
      border-radius: 50%;
      position: absolute;
      top: 14px; right: 14px;
      animation: pulse-dot 2s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { box-shadow: 0 0 0 0 rgba(102,126,234,0.4); }
      50% { box-shadow: 0 0 0 5px rgba(102,126,234,0); }
    }
  `]
})
export class NotificationsPage implements OnInit {
  state = inject(NotificationStateService);

  ngOnInit(): void {
    this.state.load();
  }

  clearAll(): void {
    this.state.deleteAll();
  }

  onTap(n: AppNotification): void {
    this.state.deleteOne(n.id);
  }

  trackById(_: number, n: AppNotification): number { return n.id; }

  orbClass(type: string): string {
    if (type === 'ORDER') return 'order';
    if (type === 'PROMO') return 'promo';
    return 'default';
  }

  notifEmoji(type: string, title: string): string {
    if (title.includes('Confirmed')) return '🎉';
    if (title.includes('Preparing')) return '👨‍🍳';
    if (title.includes('Delivery') || title.includes('Way')) return '🛵';
    if (title.includes('Delivered')) return '✅';
    if (title.includes('Cancelled')) return '❌';
    if (type === 'PROMO') return '🏷️';
    return '🔔';
  }

  timeAgo(dateStr: string): string {
    // Ensure Z suffix so JS treats it as UTC, not local time
    const normalized = dateStr && !dateStr.endsWith('Z') ? dateStr + 'Z' : dateStr;
    const diff = Date.now() - new Date(normalized).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }
}

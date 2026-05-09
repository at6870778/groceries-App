import { Injectable, effect, signal } from '@angular/core';

export interface ActivityItem {
  id: string;
  type: 'cart_add' | 'buy_now' | 'checkout' | 'order';
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class ActivityState {
  readonly items = signal<ActivityItem[]>([]);

  constructor() {
    this.hydrate();

    window.addEventListener('app-user-scope-changed', () => this.hydrate());

    // Persist activity timeline for current user scope.
    effect(() => {
      localStorage.setItem(this.storageKey(), JSON.stringify(this.items()));
    });
  }

  private storageKey(): string {
    const role = localStorage.getItem('active_role') || 'GUEST';
    const phone = localStorage.getItem('active_phone') || 'ANON';
    return `activity_state_${role}_${phone}`;
  }

  hydrate() {
    try {
      const raw = localStorage.getItem(this.storageKey());
      const parsed = raw ? JSON.parse(raw) : [];
      this.items.set(Array.isArray(parsed) ? parsed : []);
    } catch {
      this.items.set([]);
    }
  }

  log(type: ActivityItem['type'], message: string, meta?: Record<string, unknown>) {
    const entry: ActivityItem = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type,
      message,
      timestamp: new Date().toISOString(),
      meta
    };

    const next = [entry, ...this.items()].slice(0, 150);
    this.items.set(next);
  }

  remove(id: string) {
    this.items.set(this.items().filter((item) => item.id !== id));
  }

  clear() {
    this.items.set([]);
  }
}

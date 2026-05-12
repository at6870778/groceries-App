import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { CartState } from '../state/cart.state';

/**
 * SyncService — called on app startup and after login/logout.
 * Loads persisted server-side data (cart, etc.) into local signals.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  constructor(
    private api: ApiService,
    private auth: AuthService,
    private cartState: CartState,
  ) {}

  /**
   * Bootstrap sync: called once when app starts.
   * If user is already logged in, pull latest cart from backend.
   */
  init(): void {
    // Listen for login/logout scope changes and re-sync
    window.addEventListener('app-user-scope-changed', () => {
      if (this.auth.customerToken()) {
        this.syncCart();
      } else {
        // Logged out — clear local cart
        this.cartState.setItems([]);
      }
    });

    // Sync immediately if already logged in (returning user)
    if (this.auth.customerToken()) {
      this.syncCart();
    }
  }

  /** Pull cart from backend and merge into cartState signal */
  syncCart(): void {
    this.api.get<any>('/customer/cart').subscribe({
      next: (cart) => {
        const items = cart?.items || [];
        this.cartState.setItems(items);
      },
      error: () => {
        // Silently keep whatever is in localStorage — backend might be unreachable
      }
    });
  }
}

import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartState } from '../../core/state/cart.state';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="bottom-nav">
      <a class="nav-item" routerLink="/home" [class.active]="isActive('/home')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        <span class="nav-label">Home</span>
      </a>
      <a class="nav-item" routerLink="/orders" [class.active]="isActive('/orders')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        <span class="nav-label">Orders</span>
      </a>
      <!-- Cart FAB in center -->
      <a class="nav-item cart-fab" routerLink="/cart">
        <span class="cart-fab-inner">
          <svg class="cart-fab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.9 18 9 18h12v-2H9.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 23.25 8H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          <span class="cart-fab-badge" *ngIf="cartCount() > 0">{{ cartCount() }}</span>
        </span>
      </a>
      <a class="nav-item" routerLink="/products" [class.active]="isActive('/products')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
        <span class="nav-label">Browse</span>
      </a>
      <a class="nav-item" routerLink="/profile" [class.active]="isActive('/profile')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        <span class="nav-label">Account</span>
      </a>
    </nav>
  `,
  styles: [`
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: calc(62px + env(safe-area-inset-bottom, 0px));
      background: #fff;
      display: flex;
      align-items: flex-start;
      justify-content: space-around;
      padding-top: 0;
      padding-bottom: env(safe-area-inset-bottom, 0px);
      box-shadow: 0 -2px 16px rgba(0,0,0,0.10);
      border-top: 1px solid #f0f0f0;
      z-index: 1000;
    }
    /* Dark strip behind Android system nav buttons — Flipkart style */
    .bottom-nav::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: env(safe-area-inset-bottom, 0px);
      background: #111;
      pointer-events: none;
      z-index: -1;
    }
    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      height: 62px;
      text-decoration: none;
      color: #aaa;
      gap: 2px;
      padding-top: 6px;
      transition: color 0.15s;
    }
    .nav-item.active {
      color: #6c47ff;
    }
    .nav-icon {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }
    .nav-label {
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.2px;
    }
    /* Cart FAB */
    .cart-fab {
      flex: 0 0 64px;
      position: relative;
    }
    .cart-fab-inner {
      position: absolute;
      bottom: 8px;
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #6c47ff, #a855f7);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(108,71,255,0.45);
      border: 3px solid #fff;
    }
    .cart-fab-icon {
      width: 26px;
      height: 26px;
      fill: #fff;
    }
    .cart-fab-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ff3b30;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border: 2px solid #fff;
    }
  `]
})
export class BottomNavComponent {
  private cartState = inject(CartState);
  private router = inject(Router);

  readonly cartCount = computed(() =>
    this.cartState.items().length
  );

  isActive(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(path + '?');
  }
}

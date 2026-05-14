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
      <!-- Home -->
      <a class="nav-item" routerLink="/home" [class.active]="isActive('/home')">
        <span class="nav-pill">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </span>
        <span class="nav-label">Home</span>
      </a>
      <!-- Orders -->
      <a class="nav-item" routerLink="/orders" [class.active]="isActive('/orders')">
        <span class="nav-pill">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        </span>
        <span class="nav-label">Orders</span>
      </a>
      <!-- Cart FAB -->
      <a class="nav-item cart-fab" routerLink="/cart">
        <span class="cart-fab-ring"></span>
        <span class="cart-fab-inner">
          <svg class="cart-fab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.9 18 9 18h12v-2H9.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 23.25 8H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          <span class="cart-fab-badge" *ngIf="cartCount() > 0">{{ cartCount() }}</span>
        </span>
      </a>
      <!-- Browse -->
      <a class="nav-item" routerLink="/products" [class.active]="isActive('/products')">
        <span class="nav-pill">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
        </span>
        <span class="nav-label">Browse</span>
      </a>
      <!-- Account -->
      <a class="nav-item" routerLink="/profile" [class.active]="isActive('/profile')">
        <span class="nav-pill">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        </span>
        <span class="nav-label">Account</span>
      </a>
    </nav>
  `,
  styles: [`
    /* ── nav bar ── */
    .bottom-nav {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      height: calc(68px + env(safe-area-inset-bottom, 0px));
      background: rgba(255,255,255,0.97);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      display: flex;
      align-items: flex-start;
      justify-content: space-around;
      padding-top: 6px;
      padding-bottom: env(safe-area-inset-bottom, 0px);
      box-shadow: 0 -1px 0 rgba(0,0,0,0.06), 0 -8px 32px rgba(80,50,200,0.07);
      z-index: 1000;
      animation: navSlideUp 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    @keyframes navSlideUp {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    /* dark strip behind system gesture bar */
    .bottom-nav::after {
      content: '';
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: env(safe-area-inset-bottom, 0px);
      background: #111;
      pointer-events: none;
      z-index: -1;
    }

    /* ── nav item ── */
    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      height: 62px;
      text-decoration: none;
      gap: 2px;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    .nav-item:active .nav-pill {
      transform: scale(0.84) !important;
      transition: transform 0.08s ease !important;
    }

    /* ── floating pill ── */
    .nav-pill {
      width: 48px;
      height: 34px;
      border-radius: 17px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      transition:
        background 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
        transform  0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.35s ease;
    }
    .nav-item.active .nav-pill {
      background: linear-gradient(135deg, #6c47ff 0%, #9c6fff 100%);
      transform: translateY(-5px);
      box-shadow: 0 8px 20px rgba(108,71,255,0.45), 0 2px 6px rgba(108,71,255,0.2);
    }

    /* ── icon ── */
    .nav-icon {
      width: 20px;
      height: 20px;
      fill: #c4bcd8;
      transition: fill 0.25s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .nav-item.active .nav-icon {
      fill: #fff;
      transform: scale(1.12);
    }

    /* ── label ── */
    .nav-label {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.3px;
      color: #c4bcd8;
      opacity: 0;
      transform: translateY(3px);
      transition: opacity 0.25s, transform 0.25s, color 0.25s;
      height: 13px;
      line-height: 13px;
    }
    .nav-item.active .nav-label {
      color: #6c47ff;
      opacity: 1;
      transform: translateY(0);
    }

    /* ── cart FAB ── */
    .cart-fab {
      flex: 0 0 68px;
      position: relative;
      height: 62px;
    }
    /* pulsing ring behind FAB */
    .cart-fab-ring {
      position: absolute;
      bottom: 6px;
      left: 50%;
      transform: translateX(-50%);
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 2px solid rgba(108,71,255,0.35);
      animation: fabPulse 2.2s ease-out infinite;
      pointer-events: none;
    }
    @keyframes fabPulse {
      0%   { transform: translateX(-50%) scale(1);   opacity: 0.8; }
      100% { transform: translateX(-50%) scale(1.55); opacity: 0; }
    }
    .cart-fab-inner {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      width: 54px;
      height: 54px;
      background: linear-gradient(135deg, #6c47ff 0%, #a855f7 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 5px 22px rgba(108,71,255,0.55), 0 2px 8px rgba(108,71,255,0.3);
      border: 3px solid rgba(255,255,255,0.92);
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
    }
    .cart-fab:active .cart-fab-inner {
      transform: translateX(-50%) scale(0.88);
      box-shadow: 0 2px 10px rgba(108,71,255,0.35);
    }
    .cart-fab-icon {
      width: 25px;
      height: 25px;
      fill: #fff;
    }
    .cart-fab-badge {
      position: absolute;
      top: -3px;
      right: -2px;
      background: #ff3b30;
      color: #fff;
      font-size: 0.62rem;
      font-weight: 800;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
      border: 2px solid #fff;
      animation: badgePop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes badgePop {
      0%   { transform: scale(0) rotate(-15deg); }
      70%  { transform: scale(1.2) rotate(5deg); }
      100% { transform: scale(1)   rotate(0deg); }
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

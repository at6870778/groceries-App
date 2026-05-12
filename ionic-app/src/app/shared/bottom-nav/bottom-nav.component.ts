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
        <span class="nav-icon">🏠</span>
        <span class="nav-label">Home</span>
      </a>
      <a class="nav-item" routerLink="/orders" [class.active]="isActive('/orders')">
        <span class="nav-icon">📋</span>
        <span class="nav-label">Orders</span>
      </a>
      <!-- Cart FAB in center -->
      <a class="nav-item cart-fab" routerLink="/cart">
        <span class="cart-fab-inner">
          🛒
          <span class="cart-fab-badge" *ngIf="cartCount() > 0">{{ cartCount() }}</span>
        </span>
      </a>
      <a class="nav-item" routerLink="/products" [class.active]="isActive('/products')">
        <span class="nav-icon">❤️</span>
        <span class="nav-label">Saved</span>
      </a>
      <a class="nav-item" routerLink="/profile" [class.active]="isActive('/profile')">
        <span class="nav-icon">👤</span>
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
      height: 62px;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: space-around;
      box-shadow: 0 -2px 16px rgba(0,0,0,0.10);
      border-top: 1px solid #f0f0f0;
      z-index: 1000;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
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
      font-size: 1.35rem;
      line-height: 1;
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
      font-size: 1.6rem;
      box-shadow: 0 4px 16px rgba(108,71,255,0.45);
      border: 3px solid #fff;
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
    this.cartState.items().reduce((sum, i) => sum + Number(i.quantity || 0), 0)
  );

  isActive(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(path + '?');
  }
}

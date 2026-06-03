import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../core/services/auth.service';
import { SessionTimeoutService } from '../core/services/session-timeout.service';

@Component({
  standalone: true,
  selector: 'app-admin-layout',
  imports: [CommonModule, RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatSidenavModule, MatSnackBarModule],
  styles: [`
    .shell { height: 100vh; }
    .content { padding: 16px; }
    .menu { width: 220px; padding: 12px; background: #f3f8f1; }
    .menu a { display: block; margin-bottom: 8px; text-decoration: none; color: #133226; font-weight: 700; }
    .brand { font-family: "Fraunces", serif; letter-spacing: 0.2px; }
    .session-warning {
      background: #fff3cd;
      color: #856404;
      padding: 12px 16px;
      border-bottom: 2px solid #ffc107;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      font-weight: 600;
    }
  `],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav mode="side" opened class="menu">
        <h3 class="brand">Order Kro Admin</h3>
        <a routerLink="/dashboard">Dashboard</a>
        <a routerLink="/sales-report">📊 Sales Report</a>
        <a routerLink="/products">Products</a>
        <a routerLink="/orders">Orders</a>
        <a routerLink="/deliver">Deliver</a>
        <a routerLink="/customers">Customers</a>
        <a routerLink="/delivery-boys">Delivery Boys</a>
        <a routerLink="/users">👥 All Users</a>
        <a routerLink="/roles">🔐 Role Management</a>
        <a routerLink="/announcement">📢 Announcement</a>
        <a routerLink="/banners">🎨 Banners</a>
        <a routerLink="/delivery-charge">🚗 Delivery Charge</a>
        <a routerLink="/push-notifications">📲 Push Notifications</a>
        <a routerLink="/support-contact">🛟 Support Contact</a>
      </mat-sidenav>
      <mat-sidenav-content>
        <!-- Session Warning Banner -->
        <div *ngIf="sessionTimeout.isWarningVisible" class="session-warning">
          <span>⏱️ {{ sessionTimeout.warningMessage }}</span>
          <button mat-button (click)="sessionTimeout.dismissWarning()" style="color:#856404;">Dismiss</button>
        </div>
        
        <mat-toolbar color="primary">
          <span>Operations Console</span>
          <span style="flex: 1 1 auto"></span>
          <button mat-button (click)="logout()">Logout</button>
        </mat-toolbar>
        <main class="content fade-in">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `
})
export class AdminLayoutComponent {
  readonly sessionTimeout = inject(SessionTimeoutService);
  private authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}

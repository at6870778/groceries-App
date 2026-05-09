import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { AuthService } from '../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-admin-layout',
  imports: [CommonModule, RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatSidenavModule],
  styles: [`
    .shell { height: 100vh; }
    .content { padding: 16px; }
    .menu { width: 220px; padding: 12px; background: #f3f8f1; }
    .menu a { display: block; margin-bottom: 8px; text-decoration: none; color: #133226; font-weight: 700; }
    .brand { font-family: "Fraunces", serif; letter-spacing: 0.2px; }
  `],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav mode="side" opened class="menu">
        <h3 class="brand">Order Kro Admin</h3>
        <a routerLink="/dashboard">Dashboard</a>
        <a routerLink="/products">Products</a>
        <a routerLink="/orders">Orders</a>
        <a routerLink="/customers">Customers</a>
        <a routerLink="/delivery-boys">Delivery Boys</a>
      </mat-sidenav>
      <mat-sidenav-content>
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
  constructor(private authService: AuthService) {}

  logout() {
    this.authService.logout();
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header>
      <ion-toolbar class="header-bar">
        <ion-title>My Profile</ion-title>
        <button class="close-btn" (click)="goBack()">✕</button>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="false" class="ion-padding" style="--padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px))">
      
      <div class="profile-header">
        <div class="avatar">🚴</div>
        <h1 class="profile-name">{{ userDetails?.fullName || 'Delivery Partner' }}</h1>
        <p class="profile-phone">+91 {{ userDetails?.phone }}</p>
      </div>

      <div class="info-section">
        <div class="info-card">
          <div class="info-label">Phone Number</div>
          <div class="info-value">+91 {{ userDetails?.phone }}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Full Name</div>
          <div class="info-value">{{ userDetails?.fullName || 'N/A' }}</div>
        </div>
      </div>

      <div class="stats-section">
        <h3 class="section-title">📊 Your Stats</h3>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-number">{{ stats?.totalOrders || 0 }}</div>
            <div class="stat-label">Total Orders</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">{{ stats?.deliveredOrders || 0 }}</div>
            <div class="stat-label">Delivered</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">₹{{ stats?.totalEarnings || 0 }}</div>
            <div class="stat-label">Earnings</div>
          </div>
        </div>
      </div>

      <div class="action-section">
        <h3 class="section-title">⚙️ Actions</h3>
        <button class="action-btn logout-btn" (click)="logout()">
          🚪 Logout
        </button>
      </div>

      <div class="info-box">
        <p>If you have any issues or need assistance, please contact our support team.</p>
      </div>

    </ion-content>
    <div style="position:fixed;bottom:0;left:0;right:0;height:env(safe-area-inset-bottom,0px);background:#111;z-index:999;pointer-events:none;"></div>
  `,
  styles: [`
    ion-toolbar {
      --color: white;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    ion-title {
      font-size: 18px;
      font-weight: 700;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 8px 12px;
    }

    .profile-header {
      text-align: center;
      padding: 24px 0;
      border-bottom: 1px solid #f0f0f0;
      margin-bottom: 24px;
    }

    .avatar {
      font-size: 72px;
      margin-bottom: 12px;
      display: block;
    }

    .profile-name {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 6px;
    }

    .profile-phone {
      font-size: 14px;
      color: #999;
      margin: 0;
    }

    .info-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .info-card {
      background: #f9f9f9;
      padding: 14px 16px;
      border-radius: 12px;
    }

    .info-label {
      font-size: 12px;
      color: #999;
      margin-bottom: 6px;
      font-weight: 600;
    }

    .info-value {
      font-size: 16px;
      color: #1a1a1a;
      font-weight: 600;
    }

    .stats-section {
      margin-bottom: 28px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 14px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }

    .stat-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 12px;
      border-radius: 12px;
      text-align: center;
    }

    .stat-number {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .stat-label {
      font-size: 12px;
      opacity: 0.9;
    }

    .action-section {
      margin-bottom: 24px;
    }

    .action-btn {
      display: block;
      width: 100%;
      padding: 14px 16px;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #f5f5f5;
      color: #1a1a1a;
      margin-bottom: 10px;
    }

    .action-btn:hover {
      background: #e8e8e8;
    }

    .logout-btn {
      background: #ff4444;
      color: white;
    }

    .logout-btn:hover {
      background: #dd0000;
    }

    .info-box {
      background: #f0f8ff;
      border-left: 4px solid #667eea;
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 13px;
      color: #555;
      margin: 20px 0;
    }

    .info-box p {
      margin: 0;
    }
  `]
})
export class DeliveryProfilePage implements OnInit {
  userDetails: any = {};
  stats: any = {
    totalOrders: 0,
    deliveredOrders: 0,
    totalEarnings: 0
  };

  constructor(
    private router: Router,
    private auth: AuthService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.loadProfileData();
  }

  loadProfileData(): void {
    // Get current user info from AuthService
    const currentUser = this.auth.getCurrentUser();
    if (currentUser) {
      this.userDetails = currentUser;
    }

    // Load delivery stats
    this.api.get<any>('/deliveryboy/stats').subscribe({
      next: (res) => {
        if (res?.data) {
          this.stats = res.data;
        }
      },
      error: () => {
        // If stats endpoint doesn't exist, just show default values
      }
    });
  }

  logout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.auth.logout('DELIVERY_BOY');
      this.router.navigateByUrl('/delivery/login', { replaceUrl: true });
    }
  }

  goBack(): void {
    this.router.navigateByUrl('/delivery/orders');
  }
}

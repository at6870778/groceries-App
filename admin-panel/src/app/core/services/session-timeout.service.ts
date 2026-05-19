import { Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SessionTimeoutService {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private inactivityTimer: any = null;
  private tokenExpiryTimer: any = null;
  private warningTimer: any = null;
  
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before logout
  
  isWarningVisible = false;
  warningMessage = '';
  timeUntilLogout = 0;
  private warningInterval: any = null;

  constructor() {
    // Monitor authentication state
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.startSessionMonitoring();
      } else {
        this.stopAllTimers();
      }
    });
  }

  private startSessionMonitoring(): void {
    this.stopAllTimers(); // Clear any existing timers
    this.resetInactivityTimer();
    this.setupTokenExpiryTimer();
    this.setupActivityListeners();
  }

  private setupActivityListeners(): void {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, () => this.onUserActivity(), true);
    });
  }

  private onUserActivity(): void {
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    // Clear existing timer
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    
    this.isWarningVisible = false;

    // Set new inactivity timer
    this.inactivityTimer = setTimeout(() => {
      this.showWarningAndLogout();
    }, this.INACTIVITY_TIMEOUT);

    // Set warning timer (5 minutes before logout)
    this.warningTimer = setTimeout(() => {
      this.showSessionWarning();
    }, this.INACTIVITY_TIMEOUT - this.WARNING_TIME);
  }

  private setupTokenExpiryTimer(): void {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp) {
        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = expiryTime - now;

        if (timeUntilExpiry > 0) {
          // Set timer to logout when token expires
          this.tokenExpiryTimer = setTimeout(() => {
            this.handleTokenExpiry();
          }, timeUntilExpiry);
        } else {
          // Token already expired
          this.authService.logout();
        }
      }
    } catch (e) {
      console.error('Error parsing token expiry', e);
    }
  }

  private showSessionWarning(): void {
    this.isWarningVisible = true;
    this.warningMessage = 'Your session will expire in 5 minutes due to inactivity. Click anywhere to stay logged in.';
    this.startWarningCountdown();
  }

  private startWarningCountdown(): void {
    let secondsRemaining = 300; // 5 minutes
    this.warningInterval = setInterval(() => {
      secondsRemaining--;
      this.timeUntilLogout = secondsRemaining;
      
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      this.warningMessage = `Your session will expire in ${minutes}:${seconds.toString().padStart(2, '0')} due to inactivity.`;
      
      if (secondsRemaining <= 0) {
        clearInterval(this.warningInterval);
      }
    }, 1000);
  }

  private showWarningAndLogout(): void {
    console.warn('Session timeout: Logging out due to inactivity');
    this.isWarningVisible = false;
    alert('⏱️ Your session has expired due to inactivity. Please log in again.');
    this.authService.logout();
  }

  private handleTokenExpiry(): void {
    console.warn('Token expired: Logging out');
    this.isWarningVisible = false;
    alert('🔒 Your session has expired. Please log in again.');
    this.authService.logout();
  }

  dismissWarning(): void {
    this.isWarningVisible = false;
    if (this.warningInterval) clearInterval(this.warningInterval);
  }

  private stopAllTimers(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.tokenExpiryTimer) clearTimeout(this.tokenExpiryTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.warningInterval) clearInterval(this.warningInterval);
    
    // Remove event listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.removeEventListener(event, () => this.onUserActivity(), true);
    });
  }
}

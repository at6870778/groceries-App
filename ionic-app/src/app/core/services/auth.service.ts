import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

type AppRole = 'CUSTOMER' | 'DELIVERY_BOY';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = this.resolveBaseUrl();

  readonly customerToken = signal<string | null>(this.loadTokenFromStorage('customer_token'));
  readonly deliveryToken = signal<string | null>(this.loadTokenFromStorage('delivery_token'));
  readonly activeRole = signal<AppRole | null>(this.loadRoleFromStorage());

  constructor(private http: HttpClient) {}

  /** Load and validate token from storage, ensuring proper string normalization */
  private loadTokenFromStorage(key: 'customer_token' | 'delivery_token'): string | null {
    try {
      const token = localStorage.getItem(key);
      // Reject if null, undefined, or string 'undefined'/'null'
      if (!token || token === 'undefined' || token === 'null') {
        localStorage.removeItem(key);
        return null;
      }
      // Validate JWT structure (basic check)
      if (!token.includes('.')) {
        localStorage.removeItem(key);
        return null;
      }
      // Check if token is expired
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem(key);
          return null;
        }
      } catch {
        localStorage.removeItem(key);
        return null;
      }
      return token;
    } catch {
      return null;
    }
  }

  /** Load and validate role from storage */
  private loadRoleFromStorage(): AppRole | null {
    try {
      const role = localStorage.getItem('active_role');
      if (role !== 'CUSTOMER' && role !== 'DELIVERY_BOY') {
        localStorage.removeItem('active_role');
        return null;
      }
      return role as AppRole;
    } catch {
      return null;
    }
  }

  /** Utility: Check if a token is valid */
  private isTokenValid(token: string | null): boolean {
    if (!token || token === 'undefined' || token === 'null') return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return !payload.exp || payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private resolveBaseUrl(): string {
    const configuredUrl = (environment.apiUrl || '').replace(/\/$/, '');

    try {
      const parsed = new URL(configuredUrl);
      const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (!isLocalHost || !Capacitor.isNativePlatform()) {
        return configuredUrl;
      }

      const nativeHost = Capacitor.getPlatform() === 'android' ? '10.0.2.2' : parsed.hostname;
      return `${parsed.protocol}//${nativeHost}${parsed.port ? `:${parsed.port}` : ''}${parsed.pathname}`.replace(/\/$/, '');
    } catch {
      return configuredUrl;
    }
  }

  login(phone: string, fullName: string, otp: string) {
    return this.loginWithRole(phone, fullName, 'CUSTOMER', otp);
  }

  loginWithRole(phone: string, fullName: string, role: AppRole, otp: string, reqId?: string) {
    return this.http.post<{ message: string; data: any }>(`${this.baseUrl}/auth/verify-otp`, {
      phone,
      reqId,
      otp,
      fullName,
      role
    });
  }

  requestOtp(phone: string) {
    return this.http.post<{ message: string; data: string }>(`${this.baseUrl}/auth/request-otp`, { phone });
  }

  lookupCustomerName(phone: string) {
    return this.http.post<{ message: string; data: string }>(`${this.baseUrl}/auth/lookup-customer`, { phone });
  }

  retryOtp(phone: string, reqId: string) {
    return this.http.post<{ message: string; data: string }>(`${this.baseUrl}/auth/retry-otp`, {
      phone,
      reqId
    });
  }

  private notifyScopeChanged() {
    window.dispatchEvent(new Event('app-user-scope-changed'));
  }

  saveToken(token: string, role: AppRole, phone?: string) {
    // Validate token before saving
    if (!token || !token.includes('.')) {
      console.error('Invalid token format: cannot save');
      return;
    }
    
    if (role === 'DELIVERY_BOY') {
      this.deliveryToken.set(token);
      localStorage.setItem('delivery_token', token);
    } else {
      this.customerToken.set(token);
      localStorage.setItem('customer_token', token);
    }
    this.activeRole.set(role);
    localStorage.setItem('active_role', role);
    if (phone) {
      localStorage.setItem('active_phone', phone);
    }
    this.notifyScopeChanged();
  }

  clearTokens() {
    // Clear both signals AND localStorage to prevent lingering state
    this.customerToken.set(null);
    this.deliveryToken.set(null);
    this.activeRole.set(null);
    localStorage.removeItem('customer_token');
    localStorage.removeItem('delivery_token');
    localStorage.removeItem('active_role');
    localStorage.removeItem('active_phone');
    localStorage.removeItem('suggested_role');
    this.notifyScopeChanged();
  }

  logout(role?: AppRole) {
    // Logout specific role or all roles if no role specified
    if (role === 'DELIVERY_BOY') {
      this.deliveryToken.set(null);
      localStorage.removeItem('delivery_token');
    } else if (role === 'CUSTOMER') {
      this.customerToken.set(null);
      localStorage.removeItem('customer_token');
    } else {
      // If no specific role, logout both
      this.customerToken.set(null);
      this.deliveryToken.set(null);
      localStorage.removeItem('customer_token');
      localStorage.removeItem('delivery_token');
    }
    
    // If current active role matches or no specific role provided, clear active role
    if (this.activeRole() === role || !role) {
      this.activeRole.set(null);
      localStorage.removeItem('active_role');
      localStorage.removeItem('active_phone');
    }
    this.notifyScopeChanged();
  }

  /** Handle 401/403 errors - auto-logout when backend says token is invalid */
  handleAuthError(status: number) {
    if (status === 401 || status === 403) {
      console.warn(`Auth error (${status}): Clearing tokens and logging out`);
      this.clearTokens();
    }
  }

  getCurrentUser(): any {
    const role = this.activeRole();
    const token = role === 'DELIVERY_BOY' ? this.deliveryToken() : this.customerToken();
    
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        phone: payload.sub || localStorage.getItem('active_phone') || '',
        fullName: payload.name || '',
        role: role
      };
    } catch {
      return {
        phone: localStorage.getItem('active_phone') || '',
        role: role
      };
    }
  }
}

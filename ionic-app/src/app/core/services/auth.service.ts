import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

type AppRole = 'CUSTOMER' | 'DELIVERY_BOY';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = this.resolveBaseUrl();

  readonly customerToken = signal<string | null>(localStorage.getItem('customer_token'));
  readonly deliveryToken = signal<string | null>(localStorage.getItem('delivery_token'));
  readonly activeRole = signal<AppRole | null>((localStorage.getItem('active_role') as AppRole | null) ?? null);

  constructor(private http: HttpClient) {}

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

  loginWithRole(phone: string, fullName: string, role: AppRole, otp: string) {
    return this.http.post<{ message: string; data: any }>(`${this.baseUrl}/auth/verify-otp`, {
      phone,
      otp,
      fullName,
      role
    });
  }

  requestOtp(phone: string) {
    return this.http.post(`${this.baseUrl}/auth/request-otp`, { phone });
  }

  private notifyScopeChanged() {
    window.dispatchEvent(new Event('app-user-scope-changed'));
  }

  saveToken(token: string, role: AppRole, phone?: string) {
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
    this.customerToken.set(null);
    this.deliveryToken.set(null);
    this.activeRole.set(null);
    localStorage.removeItem('customer_token');
    localStorage.removeItem('delivery_token');
    localStorage.removeItem('active_role');
    localStorage.removeItem('active_phone');
    this.notifyScopeChanged();
  }
}

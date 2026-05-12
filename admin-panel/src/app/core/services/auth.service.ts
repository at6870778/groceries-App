import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSignal = signal<string | null>(this.loadValidToken());
  private readonly rolesSignal = signal<string[]>(JSON.parse(localStorage.getItem('admin_roles') || '[]'));

  readonly token = computed(() => this.tokenSignal());
  readonly roles = computed(() => this.rolesSignal());
  readonly isAuthenticated = computed(() => !!this.tokenSignal());

  constructor(private http: HttpClient, private router: Router) {}

  private loadValidToken(): string | null {
    const token = localStorage.getItem('admin_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_roles');
        return null;
      }
      return token;
    } catch {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_roles');
      return null;
    }
  }

  login(phone: string, fullName: string, otp: string, reqId?: string) {
    return this.http.post<{ message: string; data: AuthResponse }>(`${environment.apiUrl}/auth/verify-otp`, {
      phone,
      reqId,
      otp,
      fullName,
      role: 'ADMIN'
    });
  }

  requestOtp(phone: string) {
    return this.http.post<{ message: string; data: string }>(`${environment.apiUrl}/auth/request-otp`, { phone });
  }

  retryOtp(phone: string, reqId: string) {
    return this.http.post<{ message: string; data: string }>(`${environment.apiUrl}/auth/retry-otp`, {
      phone,
      reqId
    });
  }

  saveSession(response: AuthResponse) {
    this.tokenSignal.set(response.token);
    this.rolesSignal.set(response.roles);
    localStorage.setItem('admin_token', response.token);
    localStorage.setItem('admin_roles', JSON.stringify(response.roles));
  }

  logout() {
    this.tokenSignal.set(null);
    this.rolesSignal.set([]);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_roles');
    this.router.navigateByUrl('/login');
  }
}

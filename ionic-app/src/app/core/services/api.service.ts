import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = this.resolveBaseUrl();

  constructor(private http: HttpClient) {}

  private resolveBaseUrl(): string {
    const configuredUrl = (environment.apiUrl || '').replace(/\/$/, '');
    try {
      const parsed = new URL(configuredUrl);
      const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (!isLocalHost) {
        return configuredUrl;
      }

      if (!Capacitor.isNativePlatform()) {
        return configuredUrl;
      }

      const nativeHost = Capacitor.getPlatform() === 'android' ? '10.0.2.2' : parsed.hostname;
      const nativeUrl = `${parsed.protocol}//${nativeHost}${parsed.port ? `:${parsed.port}` : ''}${parsed.pathname}`;
      return nativeUrl.replace(/\/$/, '');
    } catch {
      return configuredUrl;
    }
  }

  buildUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const baseHasApi = this.baseUrl.endsWith('/api');
    const finalPath = !baseHasApi && !normalizedPath.startsWith('/api/')
      ? `/api${normalizedPath}`
      : normalizedPath;
    return `${this.baseUrl}${finalPath}`;
  }

  get<T>(path: string, params?: Record<string, any>) {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => { if (v !== null && v !== undefined) httpParams = httpParams.set(k, v); });
    }
    return this.http.get<T>(this.buildUrl(path), { params: httpParams });
  }

  post<T>(path: string, body: unknown) {
    return this.http.post<T>(this.buildUrl(path), body);
  }

  put<T>(path: string, body: unknown) {
    return this.http.put<T>(this.buildUrl(path), body);
  }

  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(this.buildUrl(path), body);
  }

  delete<T>(path: string) {
    return this.http.delete<T>(this.buildUrl(path));
  }
}

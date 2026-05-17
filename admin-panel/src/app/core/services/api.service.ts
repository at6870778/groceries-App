import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  private buildUrl(path: string): string {
    // If path starts with 'api/', remove the leading slash since apiUrl already has '/api'
    if (path.startsWith('/api/')) {
      return `${environment.apiUrl}${path.substring(4)}`; // Remove '/api' from path
    }
    return `${environment.apiUrl}${path}`;
  }

  get<T>(path: string, params?: Record<string, string | number | boolean>) {
    const normalized = Object.entries(params || {}).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>);

    const httpParams = new HttpParams({ fromObject: normalized });
    return this.http.get<T>(this.buildUrl(path), { params: httpParams });
  }

  post<T>(path: string, body: unknown) {
    return this.http.post<T>(this.buildUrl(path), body);
  }

  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(this.buildUrl(path), body);
  }

  put<T>(path: string, body: unknown) {
    return this.http.put<T>(this.buildUrl(path), body);
  }

  delete<T>(path: string) {
    return this.http.delete<T>(this.buildUrl(path));
  }

  uploadFile<T>(path: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<T>(this.buildUrl(path), formData);
  }
}

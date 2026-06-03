import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Banner {
  id: number;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
  title?: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BannerService {
  private readonly API_URL = `${environment.apiUrl}/v1/banners`;
  
  constructor(private http: HttpClient) {}
  
  /**
   * Get all active banners from backend
   */
  getActiveBanners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(this.API_URL);
  }
}

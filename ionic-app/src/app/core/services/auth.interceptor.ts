import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isPublicApi = req.url.includes('/api/auth/') || req.url.includes('/api/catalog/');
  if (isPublicApi) {
    return next(req);
  }

  const isDeliveryApi = req.url.includes('/api/delivery/');
  const token = isDeliveryApi
    ? localStorage.getItem('delivery_token')
    : localStorage.getItem('customer_token');

  const clonedReq = token && token !== 'undefined' && token !== 'null'
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(clonedReq).pipe(
    catchError((err) => {
      // Handle 401/403 - token invalid/expired
      if (err.status === 401 || err.status === 403) {
        console.warn(`HTTP ${err.status}: Token invalid. Auto-logout triggered.`);
        auth.handleAuthError(err.status);
      }
      return throwError(() => err);
    })
  );
};

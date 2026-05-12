import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/auth/request-otp') || req.url.includes('/auth/verify-otp') || req.url.includes('/auth/refresh')) {
    return next(req);
  }

  const token = localStorage.getItem('admin_token');
  const router = inject(Router);

  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((err) => {
      // Only redirect on 401 (token expired/invalid), not 403 (forbidden)
      if (err.status === 401) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_roles');
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};

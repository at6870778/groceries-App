import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/auth/request-otp') || req.url.includes('/auth/verify-otp') || req.url.includes('/auth/refresh')) {
    return next(req);
  }

  const token = localStorage.getItem('admin_token');
  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

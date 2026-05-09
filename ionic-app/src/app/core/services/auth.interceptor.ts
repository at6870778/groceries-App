import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isPublicApi = req.url.includes('/api/auth/') || req.url.includes('/api/catalog/');
  if (isPublicApi) {
    return next(req);
  }

  const isDeliveryApi = req.url.includes('/api/delivery/');
  const token = isDeliveryApi
    ? localStorage.getItem('delivery_token')
    : localStorage.getItem('customer_token');

  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('customer_token');
  if (!token || token === 'undefined' || token === 'null') {
    return router.parseUrl('/login');
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('customer_token');
      return router.parseUrl('/login');
    }
  } catch {
    localStorage.removeItem('customer_token');
    return router.parseUrl('/login');
  }
  return true;
};

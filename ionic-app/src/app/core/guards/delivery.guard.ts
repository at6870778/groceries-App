import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const deliveryGuard: CanActivateFn = () => {
  const router = inject(Router);
  const rawToken = localStorage.getItem('delivery_token');
  const hasDeliveryToken = !!rawToken && rawToken !== 'undefined' && rawToken !== 'null';
  return hasDeliveryToken ? true : router.parseUrl('/login');
};

import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const rawToken = localStorage.getItem('customer_token');
  const hasCustomerToken = !!rawToken && rawToken !== 'undefined' && rawToken !== 'null';
  return hasCustomerToken ? true : router.parseUrl('/login');
};

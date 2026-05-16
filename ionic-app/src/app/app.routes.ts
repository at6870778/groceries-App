import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { deliveryGuard } from './core/guards/delivery.guard';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

const rootGuard = () => {
  const router = inject(Router);
  const token = localStorage.getItem('customer_token');
  if (token && token !== 'undefined' && token !== 'null') {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 > Date.now()) {
        return router.parseUrl('/home');
      }
    } catch { /* invalid token, fall through to login */ }
  }
  const deliveryToken = localStorage.getItem('delivery_token');
  if (deliveryToken && deliveryToken !== 'undefined' && deliveryToken !== 'null') {
    try {
      const payload = JSON.parse(atob(deliveryToken.split('.')[1]));
      if (payload.exp && payload.exp * 1000 > Date.now()) {
        return router.parseUrl('/delivery/orders');
      }
    } catch { /* invalid token */ }
  }
  return router.parseUrl('/login');
};

export const appRoutes: Routes = [
  { path: '', canActivate: [rootGuard], loadComponent: () => import('./features/delivery-auth/delivery-login.page').then(m => m.DeliveryLoginPage) },
  { path: 'login', loadComponent: () => import('./features/delivery-auth/delivery-login.page').then(m => m.DeliveryLoginPage) },
  { path: 'home', canActivate: [authGuard], loadComponent: () => import('./features/home/home.page').then(m => m.HomePage) },
  { path: 'products', canActivate: [authGuard], loadComponent: () => import('./features/products/products.page').then(m => m.ProductsPage) },
  { path: 'cart', canActivate: [authGuard], loadComponent: () => import('./features/cart/cart.page').then(m => m.CartPage) },
  { path: 'orders', canActivate: [authGuard], loadComponent: () => import('./features/orders/orders.page').then(m => m.OrdersPage) },
  { path: 'delivery-tracking/:orderId', canActivate: [authGuard], loadComponent: () => import('./features/orders/delivery-tracking.page').then(m => m.DeliveryTrackingPage) },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./features/profile/profile.page').then(m => m.ProfilePage) },
  { path: 'notifications', canActivate: [authGuard], loadComponent: () => import('./features/notifications/notifications.page').then(m => m.NotificationsPage) },
  { path: 'delivery/orders', canActivate: [deliveryGuard], loadComponent: () => import('./features/delivery-orders/delivery-orders.page').then(m => m.DeliveryOrdersPage) },
  { path: 'delivery/profile', canActivate: [deliveryGuard], loadComponent: () => import('./features/delivery-auth/delivery-profile.page').then(m => m.DeliveryProfilePage) },
  { path: '**', redirectTo: 'login' }
];

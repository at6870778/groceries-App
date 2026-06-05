import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { deliveryGuard } from './core/guards/delivery.guard';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';

const rootGuard = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  
  // Check customer token first
  if (auth.customerToken()) {
    return router.parseUrl('/home');
  }
  
  // Check delivery token
  if (auth.deliveryToken()) {
    return router.parseUrl('/delivery/orders');
  }
  
  // No valid token, redirect to login
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

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'products', loadComponent: () => import('./features/catalog/products.component').then(m => m.ProductsComponent) },
      { path: 'orders', loadComponent: () => import('./features/orders/orders.component').then(m => m.OrdersComponent) },
      { path: 'deliver', loadComponent: () => import('./features/delivery/delivery-console.component').then(m => m.DeliveryConsoleComponent) },
      { path: 'customers', loadComponent: () => import('./features/users/customers.component').then(m => m.CustomersComponent) },
      { path: 'delivery-boys', loadComponent: () => import('./features/users/delivery-boys.component').then(m => m.DeliveryBoysComponent) },
      { path: 'announcement', loadComponent: () => import('./features/announcement/announcement.component').then(m => m.AnnouncementComponent) },
      { path: 'support-contact', loadComponent: () => import('./features/support-contact/support-contact.component').then(m => m.SupportContactComponent) },
      { path: 'push-notifications', loadComponent: () => import('./features/push-notifications/push-notifications.component').then(m => m.PushNotificationsComponent) }
    ]
  }
];

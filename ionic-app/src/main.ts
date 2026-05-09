import { bootstrapApplication } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { provideRouter, withDebugTracing, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';
import { authInterceptor } from './app/core/services/auth.interceptor';

const routerFeatures = [
  withRouterConfig({ onSameUrlNavigation: 'reload' }),
  ...(isDevMode() ? [withDebugTracing()] : [])
];

bootstrapApplication(AppComponent, {
  providers: [
    provideIonicAngular(),
    provideRouter(appRoutes, ...routerFeatures),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
});

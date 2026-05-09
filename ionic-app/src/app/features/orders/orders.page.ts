import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel],
  template: `
    <ion-header><ion-toolbar><ion-title>My Orders</ion-title></ion-toolbar></ion-header>
    <ion-content [scrollEvents]="true" [fullscreen]="false" class="ion-padding">
      <ion-list>
        <ion-item *ngFor="let o of orders()">
          <ion-label>
            <h2>#{{ o.id }} - {{ o.status }}</h2>
            <p>Rs {{ o.totalAmount }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  `
})
export class OrdersPage implements OnInit, OnDestroy {
  readonly orders = signal<any[]>([]);
  private destroy$ = new Subject<void>();

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any>('/customer/orders')
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => this.orders.set(res.content || []));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

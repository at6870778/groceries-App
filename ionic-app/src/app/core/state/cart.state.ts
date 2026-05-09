import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartState {
  readonly items = signal<any[]>([]);
  readonly subtotal = computed(() => this.items().reduce((sum, item) => sum + item.lineTotal, 0));

  setItems(items: any[]) {
    this.items.set(items);
  }
}

import { Injectable, computed, effect, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartState {
  readonly items = signal<any[]>([]);
  readonly subtotal = computed(() => this.items().reduce((sum, item) => sum + Number(item?.lineTotal || 0), 0));

  constructor() {
    this.hydrate();

    window.addEventListener('app-user-scope-changed', () => this.hydrate());

    // Persist cart snapshot so user state survives refresh/reopen.
    effect(() => {
      const key = this.storageKey();
      const data = JSON.stringify(this.items());
      localStorage.setItem(key, data);
    });
  }

  private storageKey(): string {
    const role = localStorage.getItem('active_role') || 'GUEST';
    const phone = localStorage.getItem('active_phone') || 'ANON';
    return `cart_state_${role}_${phone}`;
  }

  hydrate() {
    try {
      const raw = localStorage.getItem(this.storageKey());
      const parsed = raw ? JSON.parse(raw) : [];
      this.items.set(Array.isArray(parsed) ? parsed : []);
    } catch {
      this.items.set([]);
    }
  }

  setItems(items: any[]) {
    this.items.set(Array.isArray(items) ? items : []);
  }

  addOrIncrement(product: { id: number; name: string; sellingPrice: number; unit?: string }) {
    const next = [...this.items()];
    // Always match by productId — never by cart row id to avoid collisions
    const existing = next.find((item) => Number(item.productId) === Number(product.id));

    if (existing) {
      const qty = Number(existing.quantity || 0) + 1;
      existing.quantity = qty;
      existing.lineTotal = qty * Number(product.sellingPrice || existing.unitPrice || 0);
      existing.unitPrice = Number(product.sellingPrice || existing.unitPrice || 0);
      this.items.set(next);
      return;
    }

    const unitPrice = Number(product.sellingPrice || 0);
    next.push({
      productId: product.id,
      name: product.name,
      unit: product.unit || '',
      quantity: 1,
      unitPrice,
      lineTotal: unitPrice
    });
    this.items.set(next);
  }

  clear() {
    this.items.set([]);
  }

  removeOrDecrement(product: { id: number }) {
    const next = [...this.items()];
    const idx = next.findIndex(i => Number(i.productId) === Number(product.id));
    if (idx === -1) return;
    const qty = Number(next[idx].quantity || 0) - 1;
    if (qty <= 0) {
      next.splice(idx, 1);
    } else {
      next[idx] = { ...next[idx], quantity: qty, lineTotal: qty * Number(next[idx].unitPrice || 0) };
    }
    this.items.set(next);
  }
}

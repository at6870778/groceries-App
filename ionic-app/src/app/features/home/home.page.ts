import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonSearchbar } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { Router, RouterLink } from '@angular/router';
import { CartState } from '../../core/state/cart.state';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';
import { ActivityState } from '../../core/state/activity.state';
import { LocationService } from '../../core/services/location.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonSearchbar, BottomNavComponent],
  template: `
    <ion-header translucent>
      <ion-toolbar color="primary">
        <div slot="start" class="deliver-to-wrap" (click)="goToProfile()">
          <div class="deliver-label">📍 Delivering to</div>
          <div class="deliver-addr">
            <span class="deliver-addr-text">{{ deliveryLabel() }}</span>
            <span class="deliver-chevron">▾</span>
          </div>
        </div>
        <ion-buttons slot="end">
          <ion-button routerLink="/cart">
            <span class="cart-icon-wrap">
              <svg style="width:24px;height:24px;fill:white" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.9 18 9 18h12v-2H9.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 23.25 8H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
              <span class="cart-badge" *ngIf="totalCartItems() > 0">{{ totalCartItems() }}</span>
            </span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar class="sticky-search-toolbar">
        <ion-searchbar
          class="header-search"
          placeholder="Search groceries, vegetables..."
          [value]="searchTerm()"
          (ionInput)="searchTerm.set($any($event).detail.value || '')"
          (ionChange)="submitSearch($any($event).detail.value || '')"
          (keyup.enter)="submitSearch(searchTerm())">
        </ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content [scrollEvents]="true" [fullscreen]="false" class="home-content" style="--padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px))">

      <div class="error-banner-top" *ngIf="errorMsg()">{{ errorMsg() }}</div>

      <!-- ===== SEARCH MODE ===== -->
      <div *ngIf="hasSearchTerm()" class="browse-pad">
        <div class="section-row">
          <h3 class="section-title">Results for "{{ searchTerm().trim() }}"</h3>
          <span class="item-count">{{ filteredProducts().length }} items</span>
        </div>
        <div class="prod-grid" *ngIf="filteredProducts().length > 0; else noSearchResults">
          <div class="prod-card" *ngFor="let p of filteredProducts().slice(0,24); let i = index" [style.animationDelay.ms]="i*30" [routerLink]="['/products']" [queryParams]="{ query: p.name }">
            <div class="disc-badge" *ngIf="getDiscount(p) > 0">{{ getDiscount(p) }}%</div>
            <div class="prod-img-wrap" [style.background]="p.imageUrl ? '#f8f9f0' : productBg(p)">
              <img class="prod-img" [src]="productImage(p)" [alt]="p.name">
            </div>
            <div class="prod-body">
              <div class="prod-name">{{ p.name }}</div>
              <div class="prod-unit">{{ scaledUnit(p.unit, cartQty(p.id)) }}</div>
              <div class="prod-price-row">
                <span class="prod-mrp" *ngIf="getDiscount(p) > 0">₹{{ getOriginalPrice(p) }}</span>
                <span class="prod-price">₹{{ p.sellingPrice }}</span>
              </div>
              <div class="prod-actions" (click)="$event.stopPropagation()">
                <ng-container *ngIf="cartQty(p.id) === 0; else searchStepper">
                  <button class="add-btn-flat" (click)="addToCart(p)">+ Add</button>
                </ng-container>
                <ng-template #searchStepper>
                  <div class="stepper"><button class="step-btn" (click)="removeFromCart(p)">−</button><span class="step-qty">{{ cartQty(p.id) }}</span><button class="step-btn" (click)="addToCart(p)">+</button></div>
                </ng-template>
              </div>
            </div>
          </div>
        </div>
        <ng-template #noSearchResults>
          <div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No items found</div><div class="empty-sub">Try "milk", "banana" or "rice"</div></div>
        </ng-template>
      </div>

      <!-- ===== BROWSE MODE ===== -->
      <ng-container *ngIf="!hasSearchTerm()">

        <!-- Promo strip -->
        <div class="promo-strip" *ngIf="getHotDeals().length > 0">
          <span>🔥 {{ getHotDeals().length }} items on sale · up to {{ maxDiscount() }}% off!</span>
          <button class="promo-link" (click)="selectCategory(null)">View all</button>
        </div>

        <!-- Category chips strip -->
        <div class="cat-strip-wrap">
          <div class="cat-strip">
            <button class="cat-pill" [class.active]="selectedCategoryId() === null" (click)="selectCategory(null)">
              <div class="cat-emoji">🛒</div>
              <div class="cat-name">All</div>
            </button>
            <button class="cat-pill" *ngFor="let c of categories()"
                    [class.active]="selectedCategoryId() === c.id"
                    (click)="selectCategory(c.id)">
              <div class="cat-emoji">{{ catEmoji(c.slug) }}</div>
              <div class="cat-name">{{ c.name }}</div>
            </button>
          </div>
        </div>

        <!-- ALL view -->
        <div *ngIf="selectedCategoryId() === null" class="browse-pad">

          <!-- Hot deals row -->
          <ng-container *ngIf="getHotDeals().length > 0">
            <div class="section-row"><h3 class="section-title">🔥 Hot Deals</h3></div>
            <div class="deals-row">
              <div class="deal-chip" *ngFor="let p of getHotDeals()" [routerLink]="['/products']" [queryParams]="{ query: p.name }">
                <img class="deal-chip-img" [src]="productImage(p)" [alt]="p.name">
                <div class="deal-chip-body">
                  <div class="deal-chip-name">{{ p.name }}</div>
                  <div class="deal-chip-unit">{{ p.unit }}</div>
                  <div class="deal-chip-prices">
                    <span class="deal-chip-mrp">₹{{ getOriginalPrice(p) }}</span>
                    <span class="deal-chip-price">₹{{ p.sellingPrice }}</span>
                  </div>
                </div>
                <div class="deal-chip-badge">{{ getDiscount(p) }}%<br>OFF</div>
                <div class="deal-chip-action" (click)="$event.stopPropagation()">
                  <ng-container *ngIf="cartQty(p.id) === 0; else dealStepper">
                    <button class="add-btn-flat" (click)="addToCart(p)">+ Add</button>
                  </ng-container>
                  <ng-template #dealStepper>
                    <div class="stepper stepper-xs"><button class="step-btn" (click)="removeFromCart(p)">−</button><span class="step-qty">{{ cartQty(p.id) }}</span><button class="step-btn" (click)="addToCart(p)">+</button></div>
                  </ng-template>
                </div>
              </div>
            </div>
          </ng-container>

          <!-- All products grid -->
          <div class="section-row" style="margin-top:16px">
            <h3 class="section-title">✨ All Products</h3>
            <span class="item-count">{{ products().length }} items</span>
          </div>
          <div class="prod-grid" *ngIf="products().length > 0; else noItems">
            <div class="prod-card" *ngFor="let p of products().slice(0,40); let i = index" [style.animationDelay.ms]="i*20" [routerLink]="['/products']" [queryParams]="{ query: p.name }">
              <div class="disc-badge" *ngIf="getDiscount(p) > 0">{{ getDiscount(p) }}%</div>
              <div class="prod-img-wrap" [style.background]="p.imageUrl ? '#f8f9f0' : productBg(p)">
                <img class="prod-img" [src]="productImage(p)" [alt]="p.name">
              </div>
              <div class="prod-body">
                <div class="prod-cat-tag">{{ p.categoryName }}</div>
                <div class="prod-name">{{ p.name }}</div>
                <div class="prod-unit">{{ scaledUnit(p.unit, cartQty(p.id)) }}</div>
                <div class="prod-price-row">
                  <span class="prod-mrp" *ngIf="getDiscount(p) > 0">₹{{ getOriginalPrice(p) }}</span>
                  <span class="prod-price">₹{{ p.sellingPrice }}</span>
                </div>
                <div class="prod-actions" (click)="$event.stopPropagation()">
                  <ng-container *ngIf="cartQty(p.id) === 0; else allStepper">
                    <button class="add-btn-flat" (click)="addToCart(p)">+ Add</button>
                  </ng-container>
                  <ng-template #allStepper>
                    <div class="stepper"><button class="step-btn" (click)="removeFromCart(p)">−</button><span class="step-qty">{{ cartQty(p.id) }}</span><button class="step-btn" (click)="addToCart(p)">+</button></div>
                  </ng-template>
                </div>
              </div>
            </div>
          </div>
          <ng-template #noItems>
            <div class="empty-state"><div class="empty-icon">🛒</div><div class="empty-title">No products yet</div></div>
          </ng-template>
        </div>

        <!-- CATEGORY-FILTERED view -->
        <div *ngIf="selectedCategoryId() !== null" class="browse-pad">
          <div class="section-row">
            <h3 class="section-title">{{ catEmoji(activeCategorySlug()) }} {{ activeCategoryName() }}</h3>
            <span class="item-count">{{ categoryProducts().length }} items</span>
          </div>
          <div class="prod-grid" *ngIf="categoryProducts().length > 0; else emptyCategory">
            <div class="prod-card" *ngFor="let p of categoryProducts(); let i = index" [style.animationDelay.ms]="i*30" [routerLink]="['/products']" [queryParams]="{ query: p.name }">
              <div class="disc-badge" *ngIf="getDiscount(p) > 0">{{ getDiscount(p) }}%</div>
              <div class="prod-img-wrap" [style.background]="p.imageUrl ? '#f8f9f0' : productBg(p)">
                <img class="prod-img" [src]="productImage(p)" [alt]="p.name">
              </div>
              <div class="prod-body">
                <div class="prod-name">{{ p.name }}</div>
                <div class="prod-unit">{{ scaledUnit(p.unit, cartQty(p.id)) }}</div>
                <div class="prod-price-row">
                  <span class="prod-mrp" *ngIf="getDiscount(p) > 0">₹{{ getOriginalPrice(p) }}</span>
                  <span class="prod-price">₹{{ p.sellingPrice }}</span>
                </div>
                <div class="prod-actions" (click)="$event.stopPropagation()">
                  <ng-container *ngIf="cartQty(p.id) === 0; else catStepper">
                    <button class="add-btn-flat" (click)="addToCart(p)">+ Add</button>
                  </ng-container>
                  <ng-template #catStepper>
                    <div class="stepper"><button class="step-btn" (click)="removeFromCart(p)">−</button><span class="step-qty">{{ cartQty(p.id) }}</span><button class="step-btn" (click)="addToCart(p)">+</button></div>
                  </ng-template>
                </div>
              </div>
            </div>
          </div>
          <ng-template #emptyCategory>
            <div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">No products in this category yet</div><div class="empty-sub">Check back soon!</div></div>
          </ng-template>
        </div>

      </ng-container><!-- end browse mode -->
    </ion-content>
    <app-bottom-nav></app-bottom-nav>
  `,
  styles: [`
    ion-header {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --color: white;
    }
    .cart-icon-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .cart-badge {
      position: absolute;
      top: -6px;
      right: -8px;
      background: #ff3b30;
      color: #fff;
      font-size: 0.6rem;
      font-weight: 800;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
      pointer-events: none;
      line-height: 1;
      z-index: 10;
    }
    .sticky-search-toolbar {
      --background: rgba(255,255,255,0.96);
      --min-height: 56px;
      padding: 0 8px;
    }
    .header-search {
      --background: #fff;
      --color: #333;
      --icon-color: #667eea;
      margin: 6px 0;
    }
    .home-content {
      --background: #f5f6fa;
    }
    /* ── Delivering to ── */
    .deliver-to-wrap {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 6px 12px 6px 8px;
      cursor: pointer;
      min-width: 0;
      max-width: calc(100vw - 100px);
    }
    .deliver-label {
      font-size: 0.72rem;
      font-weight: 600;
      opacity: 0.85;
      letter-spacing: 0.3px;
      color: #fff;
      line-height: 1.2;
    }
    .deliver-addr {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #fff;
    }
    .deliver-addr-text {
      font-size: 0.95rem;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: calc(100vw - 120px);
      line-height: 1.3;
    }
    .deliver-chevron { font-size: 1rem; opacity: 0.85; flex-shrink: 0; }
    /* ── Error banner ── */
    .error-banner-top {
      margin: 10px 14px 0;
      padding: 10px 14px;
      background: #ffebee;
      color: #c62828;
      border-radius: 10px;
      font-size: 0.85rem;
      border-left: 3px solid #c62828;
    }
    /* ── Promo strip ── */
    .promo-strip {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      font-size: 0.82rem;
      font-weight: 600;
      gap: 8px;
    }
    .promo-link {
      background: rgba(255,255,255,0.2);
      border: none;
      color: #fff;
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
    }
    /* ── Category strip ── */
    .cat-strip-wrap {
      background: #fff;
      border-bottom: 1px solid #eee;
      padding: 10px 0 8px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .cat-strip {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 0 14px;
      scrollbar-width: none;
    }
    .cat-strip::-webkit-scrollbar { display: none; }
    .cat-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      background: #f5f6fa;
      border: 1.5px solid #e8ecf4;
      border-radius: 12px;
      padding: 8px 10px;
      cursor: pointer;
      flex-shrink: 0;
      min-width: 64px;
      transition: all 0.18s;
    }
    .cat-pill.active {
      background: #eef1ff;
      border-color: #667eea;
    }
    .cat-emoji {
      font-size: 1.5rem;
      line-height: 1;
    }
    .cat-name {
      font-size: 0.68rem;
      font-weight: 700;
      color: #555;
      white-space: nowrap;
      text-align: center;
      line-height: 1.2;
    }
    .cat-pill.active .cat-name { color: #667eea; }
    /* ── Browse pad ── */
    .browse-pad {
      padding: 14px 14px 20px;
    }
    /* ── Section row ── */
    .section-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .section-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
      color: #1a1a1a;
    }
    .item-count {
      font-size: 0.8rem;
      color: #888;
      font-weight: 600;
      background: #f0f0f0;
      border-radius: 20px;
      padding: 3px 8px;
    }
    /* ── Hot deals horizontal row ── */
    .deals-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }
    .deal-chip {
      display: flex;
      align-items: center;
      background: #fff;
      border-radius: 14px;
      padding: 10px 12px;
      gap: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      cursor: pointer;
      border: 1px solid #e8ecf4;
    }
    .deal-chip-img {
      width: 56px;
      height: 56px;
      object-fit: contain;
      border-radius: 8px;
      background: #f8f9fa;
      flex-shrink: 0;
    }
    .deal-chip-body {
      flex: 1;
      min-width: 0;
    }
    .deal-chip-name {
      font-weight: 700;
      font-size: 0.9rem;
      color: #1a1a1a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .deal-chip-unit {
      font-size: 0.75rem;
      color: #888;
      margin: 1px 0 4px;
    }
    .deal-chip-prices {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .deal-chip-mrp {
      text-decoration: line-through;
      color: #bbb;
      font-size: 0.78rem;
    }
    .deal-chip-price {
      font-weight: 800;
      color: #16a34a;
      font-size: 1rem;
    }
    .deal-chip-badge {
      background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
      color: #fff;
      border-radius: 8px;
      padding: 4px 6px;
      font-size: 0.7rem;
      font-weight: 800;
      text-align: center;
      line-height: 1.3;
      flex-shrink: 0;
    }
    .deal-chip-action { flex-shrink: 0; }
    /* ── Product grid ── */
    .prod-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .prod-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e8ecf4;
      overflow: hidden;
      position: relative;
      cursor: pointer;
      animation: rise 0.4s ease both;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
    }
    .disc-badge {
      position: absolute;
      top: 7px;
      right: 7px;
      background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
      color: #fff;
      border-radius: 6px;
      padding: 2px 6px;
      font-size: 0.7rem;
      font-weight: 800;
      z-index: 2;
    }
    .prod-img-wrap {
      width: 100%;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .prod-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 6px;
    }
    .prod-body {
      padding: 8px 10px 10px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .prod-cat-tag {
      font-size: 0.65rem;
      font-weight: 700;
      color: #667eea;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .prod-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: #1a1a1a;
      line-height: 1.3;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .prod-unit {
      font-size: 0.75rem;
      color: #999;
    }
    .prod-price-row {
      display: flex;
      align-items: center;
      gap: 5px;
      margin: 2px 0 6px;
    }
    .prod-mrp {
      text-decoration: line-through;
      color: #bbb;
      font-size: 0.75rem;
    }
    .prod-price {
      font-weight: 800;
      color: #1a1a1a;
      font-size: 1rem;
    }
    .prod-actions {
      margin-top: auto;
    }
    /* Flat add button */
    .add-btn-flat {
      width: 100%;
      padding: 7px 0;
      background: #fff;
      border: 1.5px solid #16a34a;
      border-radius: 8px;
      color: #16a34a;
      font-size: 0.82rem;
      font-weight: 800;
      cursor: pointer;
      transition: background 0.15s;
    }
    .add-btn-flat:hover { background: #f0faf5; }
    /* Stepper */
    .stepper {
      display: flex;
      align-items: stretch;
      background: #16a34a;
      border-radius: 8px;
      overflow: hidden;
      height: 32px;
    }
    .stepper-xs { height: 28px; border-radius: 7px; }
    .step-btn {
      background: transparent;
      border: none;
      color: #fff;
      font-size: 1.1rem;
      font-weight: 700;
      width: 32px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .step-qty {
      color: #fff;
      font-weight: 700;
      font-size: 0.9rem;
      flex: 1;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
    }
    .empty-icon { font-size: 2.5rem; margin-bottom: 10px; }
    .empty-title { font-weight: 700; font-size: 1rem; color: #444; }
    .empty-sub { font-size: 0.85rem; color: #888; margin-top: 4px; }
    @keyframes rise {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class HomePage implements OnInit, OnDestroy {
  readonly searchTerm = signal('');
  readonly categories = signal<any[]>([]);
  readonly products = signal<any[]>([]);
  readonly adding = signal<number | null>(null);
  // 'added' signal removed — stepper driven by cartState.items() directly
  readonly errorMsg = signal('');
  readonly quickSearches = ['Milk', 'Banana', 'Rice', 'Bread', 'Chips', 'Juice'];
  /** Currently selected category id — null means "All" */
  readonly selectedCategoryId = signal<number | null>(null);
  private destroy$ = new Subject<void>();

  /** Saved addresses loaded from API */
  readonly savedAddresses = signal<any[]>([]);

  /** Computed label for the "Delivering to" bar */
  readonly deliveryLabel = computed(() => {
    const addresses = this.savedAddresses();
    const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
    if (defaultAddr) {
      const label = defaultAddr.label ? `${defaultAddr.label}: ` : '';
      return `${label}${defaultAddr.line1 || defaultAddr.addressLine1 || ''}`;
    }
    const gpsAddr = this.locationService.currentLocation()?.address;
    // Skip raw coordinate strings (e.g. "26.7333, 83.8167") — geocode still loading
    if (gpsAddr && !/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(gpsAddr.trim())) {
      return gpsAddr.split(',').slice(0, 2).join(', ');
    }
    if (this.locationService.isLocating() || this.locationService.currentLocation()) return 'Detecting location…';
    return 'Add your location →';
  });

  private readonly productPhotoByKeyword: Record<string, string> = {
    banana: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Bananavarieties.jpg',
    tomato: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/960px-Tomato_je.jpg',
    milk: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Dairy_Crest_Semi_Skimmed_Milk_Bottle.jpg/960px-Dairy_Crest_Semi_Skimmed_Milk_Bottle.jpg',
    bread: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Korb_mit_Br%C3%B6tchen.JPG/960px-Korb_mit_Br%C3%B6tchen.JPG',
    chips: 'https://upload.wikimedia.org/wikipedia/commons/8/83/French_Fries.JPG',
    juice: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Oranges_-_whole-halved-segment.jpg/960px-Oranges_-_whole-halved-segment.jpg',
    daal: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/3_types_of_lentil.png/960px-3_types_of_lentil.png',
    dal: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/3_types_of_lentil.png/960px-3_types_of_lentil.png',
    chini: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Sucre_blanc_cassonade_complet_rapadura.jpg/960px-Sucre_blanc_cassonade_complet_rapadura.jpg',
    sugar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Sucre_blanc_cassonade_complet_rapadura.jpg/960px-Sucre_blanc_cassonade_complet_rapadura.jpg',
    atta: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/BESAN_CHAKKI_HOMEMADE_KOTA_003.jpg/960px-BESAN_CHAKKI_HOMEMADE_KOTA_003.jpg',
    flour: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/BESAN_CHAKKI_HOMEMADE_KOTA_003.jpg/960px-BESAN_CHAKKI_HOMEMADE_KOTA_003.jpg',
    rice: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Khyma_and_Basmati_rice.jpg',
    jeera: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Black_Cumin.jpg/960px-Black_Cumin.jpg',
    cumin: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Black_Cumin.jpg/960px-Black_Cumin.jpg',
    surf: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Diskflaskor.JPG/960px-Diskflaskor.JPG',
    detergent: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Diskflaskor.JPG/960px-Diskflaskor.JPG',
    dishwash: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Diskflaskor.JPG/960px-Diskflaskor.JPG',
    agarbatti: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Incenselonghua.jpg',
    incense: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Incenselonghua.jpg'
  };

  private readonly categoryPhotoBySlug: Record<string, string> = {
    'fruits-vegetables': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Red_Apple.JPG',
    'dairy-bread': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Korb_mit_Br%C3%B6tchen.JPG/960px-Korb_mit_Br%C3%B6tchen.JPG',
    snacks: 'https://upload.wikimedia.org/wikipedia/commons/8/83/French_Fries.JPG',
    beverages: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Oranges_-_whole-halved-segment.jpg/960px-Oranges_-_whole-halved-segment.jpg',
    'staples-pulses': 'https://upload.wikimedia.org/wikipedia/commons/0/07/Khyma_and_Basmati_rice.jpg',
    'spices-masala': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Black_Cumin.jpg/960px-Black_Cumin.jpg',
    'home-care': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Diskflaskor.JPG/960px-Diskflaskor.JPG',
    'pooja-spiritual': 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Incenselonghua.jpg'
  };

  constructor(
    private api: ApiService,
    private router: Router,
    private cartState: CartState,
    private activityState: ActivityState,
    public locationService: LocationService
  ) {}

  ngOnInit() {
    this.api.get<any[]>('/customer/profile/addresses')
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => this.savedAddresses.set(res || []) });

    // Kick off GPS detection if no saved location yet
    if (!this.locationService.currentLocation()) {
      this.locationService.detectCurrentLocation().catch(() => {});
    }

    this.api.get<any>('/catalog/categories')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.categories.set(res?.content || []),
        error: () => this.errorMsg.set('Could not load categories')
      });
    this.api.get<any>('/catalog/products', { page: 0, size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.products.set(res?.content || []),
        error: () => this.errorMsg.set('Could not load products')
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  private normalizedSearchTerm() {
    return this.searchTerm().trim().toLowerCase();
  }

  hasSearchTerm() {
    return this.normalizedSearchTerm().length > 0;
  }

  private matchesProduct(product: any, term: string) {
    if (!term) return true;
    const name = String(product?.name || '').toLowerCase();
    const description = String(product?.description || '').toLowerCase();
    const unit = String(product?.unit || '').toLowerCase();
    const categoryName = String(product?.categoryName || '').toLowerCase();
    return [name, description, unit, categoryName].some((value) => value.includes(term));
  }

  filteredProducts() {
    const term = this.normalizedSearchTerm();
    return this.products().filter((product) => this.matchesProduct(product, term));
  }

  filteredCategories() {
    const term = this.normalizedSearchTerm();
    if (!term) return this.categories();
    return this.categories().filter((category) => {
      const categoryName = String(category?.name || '').toLowerCase();
      return categoryName.includes(term) || this.filteredProducts().some((product) => product.categoryId === category.id);
    });
  }

  featuredProducts() { return this.filteredProducts().slice(0, 8); }

  selectCategory(id: number | null): void {
    this.selectedCategoryId.set(id);
  }

  readonly categoryProducts = computed(() => {
    const id = this.selectedCategoryId();
    if (id === null) return this.products();
    return this.products().filter(p => p.categoryId === id);
  });

  activeCategoryName(): string {
    const id = this.selectedCategoryId();
    return this.categories().find(c => c.id === id)?.name || 'Products';
  }

  activeCategorySlug(): string {
    const id = this.selectedCategoryId();
    return this.categories().find(c => c.id === id)?.slug || '';
  }

  maxDiscount(): number {
    if (!this.products().length) return 0;
    return Math.max(...this.products().map(p => this.getDiscount(p)));
  }

  catEmoji(slug: string): string {
    const map: Record<string, string> = {
      'fruits-vegetables': '🥦', 'dairy-bread': '🥛', 'snacks': '🍿',
      'beverages': '☕', 'staples-pulses': '🌾', 'spices-masala': '🌶️',
      'home-care': '🧹', 'pooja-spiritual': '🪔'
    };
    return map[slug] || '🛍️';
  }

  previewProducts(catId: number) {
    return this.filteredProducts().filter(p => p.categoryId === catId).slice(0, 2);
  }

  categoryItemCount(catId: number) {
    return this.filteredProducts().filter(p => p.categoryId === catId).length;
  }

  getHotDeals() {
    return this.products()
      .filter(p => this.getDiscount(p) > 5)
      .sort((a, b) => this.getDiscount(b) - this.getDiscount(a))
      .slice(0, 6);
  }

  getDiscount(product: any) {
    if (!product?.mrp || +product.mrp <= +product.sellingPrice) return 0;
    return Math.round(((+product.mrp - +product.sellingPrice) / +product.mrp) * 100);
  }

  getOriginalPrice(product: any) {
    return product?.mrp || 0;
  }

  getBrandName(productName: string) {
    const words = productName.split(' ');
    return words[0] || 'Fresh';
  }

  buyNow(product: any) {
    this.adding.set(product.id);
    this.api.post('/customer/cart/items', { productId: product.id, quantity: 1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.adding.set(null);
          this.cartState.addOrIncrement(product);
          this.activityState.log('buy_now', `Started quick checkout for ${product.name}`, { productId: product.id });
          this.router.navigateByUrl('/cart');
        },
        error: () => {
          this.adding.set(null);
          this.errorMsg.set('Could not start checkout right now');
        }
      });
  }

  addToCart(product: any) {
    const currentQty = this.cartQty(product.id);
    this.cartState.addOrIncrement(product);
    this.activityState.log('cart_add', `Added ${product.name} to cart`, { productId: product.id });
    this.api.post('/customer/cart/items', { productId: product.id, quantity: currentQty + 1 })
      .pipe(takeUntil(this.destroy$)).subscribe({ error: () => { this.cartState.removeOrDecrement({ id: product.id }); } });
  }

  removeFromCart(product: any) {
    const currentQty = this.cartQty(product.id);
    this.cartState.removeOrDecrement(product);
    const request$ = currentQty <= 1
      ? this.api.delete(`/customer/cart/items/${product.id}`)
      : this.api.post('/customer/cart/items', { productId: product.id, quantity: currentQty - 1 });
    request$.pipe(takeUntil(this.destroy$)).subscribe({ error: () => { this.cartState.addOrIncrement(product); } });
  }

  totalCartItems(): number {
    return this.cartState.items().length;
  }

  cartQty(productId: number): number {
    const item = this.cartState.items().find(i => Number(i.productId) === Number(productId));
    return item ? Number(item.quantity || 0) : 0;
  }

  scaledUnit(unit: string, qty: number): string {
    if (!unit || qty <= 1) return unit || '';
    const match = unit.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
    if (!match) return unit;
    const base = parseFloat(match[1]);
    const suffix = match[2].trim();
    const total = base * qty;
    const lo = suffix.toLowerCase();
    if (lo === 'g' || lo === 'gm' || lo === 'gms' || lo === 'gram' || lo === 'grams') {
      if (total >= 1000) { const v = total / 1000; return `${v % 1 === 0 ? v : v.toFixed(1)} kg`; }
      return `${total} ${suffix}`;
    }
    if (lo === 'ml') {
      if (total >= 1000) { const v = total / 1000; return `${v % 1 === 0 ? v : v.toFixed(1)} L`; }
      return `${total} ml`;
    }
    const v = total % 1 === 0 ? total : parseFloat(total.toFixed(1));
    return `${v} ${suffix}`;
  }

  productImage(product: any) {
    if (product?.imageUrl) return product.imageUrl;
    const name = String(product?.name || '').toLowerCase();
    const match = Object.keys(this.productPhotoByKeyword).find((k) => name.includes(k));
    if (match) return this.productPhotoByKeyword[match];
    return 'https://upload.wikimedia.org/wikipedia/commons/d/de/Bananavarieties.jpg';
  }

  productBg(product: any) {
    const colors = ['#ffe3c2', '#c2e3ff', '#e3c2ff', '#c2ffe3', '#ffffc2', '#ffc2c2'];
    return colors[Math.abs(product.id % colors.length)];
  }

  categoryImage(category: any) {
    if (category?.imageUrl) return category.imageUrl;
    const slug = String(category?.slug || '').toLowerCase();
    if (slug in this.categoryPhotoBySlug) return this.categoryPhotoBySlug[slug as keyof typeof this.categoryPhotoBySlug];
    return 'https://upload.wikimedia.org/wikipedia/commons/1/15/Red_Apple.JPG';
  }

  categoryBg(category: any) {
    const colors = ['#ffe3c2', '#c2e3ff', '#e3c2ff', '#c2ffe3', '#ffffc2', '#ffc2c2'];
    return colors[Math.abs(category.id % colors.length)];
  }

  openCategory(category: any) {
    this.router.navigate(['/products'], {
      queryParams: { categoryId: category.id, categoryName: category.name }
    });
  }

  openSearch(term: string) {
    const query = String(term || '').trim();
    if (!query) return;
    this.router.navigateByUrl(`/products?query=${encodeURIComponent(query)}`);
  }

  quickSearch(term: string) {
    this.openSearch(term);
  }

  submitSearch(term: string) {
    this.openSearch(term);
  }

  viewAllDeals() {
    this.router.navigate(['/products']);
  }

}


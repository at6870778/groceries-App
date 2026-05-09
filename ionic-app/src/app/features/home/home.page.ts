import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonButtons, IonButton, IonSearchbar, IonBadge } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonButtons, IonButton, IonSearchbar, IonBadge],
  template: `
    <ion-header translucent>
      <ion-toolbar color="primary">
        <ion-title style="font-weight: 700; font-size: 1.4rem;">🛒 Order Kro</ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/cart">🛒</ion-button>
          <ion-button routerLink="/profile">👤</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content [scrollEvents]="true" [fullscreen]="false" class="home-content">
      <div class="hero-section">
        <div class="hero-banner">
          <h1>Fresh Groceries<br><span class="highlight">In 10 Minutes</span></h1>
          <p>Daily staples, fresh produce & beverages at your doorstep</p>
        </div>

        <ion-searchbar
          class="hero-search"
          placeholder="Search: milk, banana, rice..."
          [value]="searchTerm()"
          (ionInput)="searchTerm.set($any($event).detail.value || '')"
          (ionChange)="submitSearch($any($event).detail.value || '')"
          (keyup.enter)="submitSearch(searchTerm())">
        </ion-searchbar>

        <div class="quick-search">
          <button class="quick-btn" *ngFor="let q of quickSearches" (click)="quickSearch(q)">{{ q }}</button>
        </div>
      </div>

      <div class="content-wrapper ion-padding">
        <section class="reveal" *ngIf="errorMsg()">
          <p class="error">{{ errorMsg() }}</p>
        </section>

        <section class="search-results-section reveal" *ngIf="hasSearchTerm()">
          <div class="section-header">
            <h2>Search Results</h2>
            <div class="search-meta">{{ filteredProducts().length }} match{{ filteredProducts().length === 1 ? '' : 'es' }}</div>
          </div>
          <div class="search-query-chip">Showing results for "{{ searchTerm().trim() }}"</div>

          <div class="product-grid" *ngIf="filteredProducts().length > 0; else noSearchResults">
            <ion-card class="product-card premium" *ngFor="let p of filteredProducts().slice(0, 8); let i = index" [style.animationDelay.ms]="i * 45" button="true" [routerLink]="['/products']" [queryParams]="{ query: p.name }">
              <div class="card-badge" *ngIf="getDiscount(p.sellingPrice) > 0">{{ getDiscount(p.sellingPrice) }}%</div>
              <div class="product-art" [style.background]="productBg(p)">
                <img class="art-image" [src]="productImage(p)" [alt]="p.name">
              </div>
              <ion-card-header class="product-info">
                <div class="product-brand">{{ getBrandName(p.name) }}</div>
                <ion-card-title class="product-name">{{ p.name }}</ion-card-title>
                <p class="unit">{{ p.unit }}</p>
                <div class="price-row">
                  <span class="original-price" *ngIf="getDiscount(p.sellingPrice) > 0">₹{{ getOriginalPrice(p.sellingPrice) }}</span>
                  <span class="sale-price">₹{{ p.sellingPrice }}</span>
                </div>
                <div class="card-actions">
                  <ion-button size="small" class="buy-now-btn" (click)="$event.stopPropagation(); buyNow(p.id)" [disabled]="adding() === p.id">
                    {{ adding() === p.id ? 'Adding...' : 'Buy Now' }}
                  </ion-button>
                </div>
              </ion-card-header>
            </ion-card>
          </div>
          <ng-template #noSearchResults>
            <div class="empty search-empty">No items found for "{{ searchTerm().trim() }}"</div>
          </ng-template>
        </section>

        <!-- HOT DEALS SECTION -->
        <section class="hot-deals-section reveal" *ngIf="getHotDeals().length > 0">
          <div class="section-header">
            <h2>🔥 Hot Deals</h2>
            <ion-button fill="clear" size="small" (click)="viewAllDeals()">View All</ion-button>
          </div>
          <div class="deals-scroll">
            <ion-card class="deal-card" *ngFor="let p of getHotDeals(); let i = index" button="true" [routerLink]="['/products']" [queryParams]="{ query: p.name }" [style.animationDelay.ms]="i * 40">
              <div class="deal-badge">{{ getDiscount(p.sellingPrice) }}% OFF</div>
              <div class="product-art" [style.background]="productBg(p)">
                <img class="art-image" [src]="productImage(p)" [alt]="p.name">
              </div>
              <ion-card-header class="deal-info">
                <div class="brand">{{ getBrandName(p.name) }}</div>
                <ion-card-title class="product-name">{{ p.name }}</ion-card-title>
                <div class="product-unit">{{ p.unit }}</div>
                <div class="price-section">
                  <span class="original-price">₹{{ getOriginalPrice(p.sellingPrice) }}</span>
                  <span class="sale-price">₹{{ p.sellingPrice }}</span>
                </div>
                <div class="delivery-badge">📦 10 mins</div>
              </ion-card-header>
            </ion-card>
          </div>
        </section>

        <!-- SHOP BY CATEGORY -->
        <section class="reveal">
          <div class="section-header">
            <h2>Shop By Category</h2>
          </div>
          <div class="category-grid">
            <ion-card class="category-card" button="true" *ngFor="let c of filteredCategories(); let i = index" [routerLink]="['/products']" [queryParams]="{ categoryId: c.id, categoryName: c.name }" [style.animationDelay.ms]="i * 45">
              <div class="category-art" [style.background]="categoryBg(c)">
                <img class="art-image" [src]="categoryImage(c)" [alt]="c.name">
              </div>
              <div class="category-info">
                <div class="category-name">{{ c.name }}</div>
                <div class="category-count">{{ categoryItemCount(c.id) }} items</div>
              </div>
            </ion-card>
          </div>
        </section>

        <!-- POPULAR ITEMS -->
        <section class="reveal">
          <div class="section-header">
            <h2>✨ Popular Items</h2>
            <ion-button fill="clear" size="small" (click)="openSearch(searchTerm())">View More</ion-button>
          </div>
          <div class="product-grid" *ngIf="featuredProducts().length > 0; else noItems">
            <ion-card class="product-card premium" *ngFor="let p of featuredProducts(); let i = index" [style.animationDelay.ms]="i * 55" button="true" [routerLink]="['/products']" [queryParams]="{ query: p.name }">
              <div class="card-badge" *ngIf="getDiscount(p.sellingPrice) > 0">{{ getDiscount(p.sellingPrice) }}%</div>
              <div class="product-art" [style.background]="productBg(p)">
                <img class="art-image" [src]="productImage(p)" [alt]="p.name">
              </div>
              <ion-card-header class="product-info">
                <div class="product-brand">{{ getBrandName(p.name) }}</div>
                <ion-card-title class="product-name">{{ p.name }}</ion-card-title>
                <p class="unit">{{ p.unit }}</p>
                <div class="price-row">
                  <span class="original-price" *ngIf="getDiscount(p.sellingPrice) > 0">₹{{ getOriginalPrice(p.sellingPrice) }}</span>
                  <span class="sale-price">₹{{ p.sellingPrice }}</span>
                </div>
                <div class="card-actions">
                  <ion-button size="small" class="buy-now-btn" (click)="$event.stopPropagation(); buyNow(p.id)" [disabled]="adding() === p.id">
                    {{ adding() === p.id ? 'Adding...' : 'Buy Now' }}
                  </ion-button>
                </div>
              </ion-card-header>
            </ion-card>
          </div>
          <ng-template #noItems>
            <div class="empty">No items found</div>
          </ng-template>
        </section>

        <!-- TOP PICKS BY CATEGORY -->
        <section class="reveal" *ngIf="filteredCategories().length > 0">
          <div class="section-header">
            <h2>🎯 Top Picks by Category</h2>
          </div>
          <div class="category-preview" *ngFor="let c of filteredCategories(); let i = index" [style.animationDelay.ms]="i * 40">
            <div class="category-header">
              <strong>{{ c.name }}</strong>
              <ion-button size="small" fill="clear" (click)="openCategory(c)">View All →</ion-button>
            </div>
            <div class="preview-items" *ngIf="previewProducts(c.id).length > 0; else emptyCategory">
              <div class="preview-item" *ngFor="let p of previewProducts(c.id)" [routerLink]="['/products']" [queryParams]="{ query: p.name }">
                <img class="thumb" [src]="productImage(p)" [alt]="p.name">
                <div class="item-details">
                  <div class="item-name">{{ p.name }}</div>
                  <div class="item-unit">{{ p.unit }}</div>
                </div>
                <div class="item-price">₹{{ p.sellingPrice }}</div>
              </div>
            </div>
            <ng-template #emptyCategory>
              <div class="empty-small">No products available</div>
            </ng-template>
          </div>
        </section>

        <ion-button expand="block" class="my-orders-btn" routerLink="/orders" color="secondary">📋 View My Orders</ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-header {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --color: white;
    }
    .home-content {
      --background: linear-gradient(180deg, #f8f9ff 0%, #ffffff 50%, #f5f7ff 100%);
      --scroll-padding-top: 0;
      --scroll-padding-bottom: 0;
      display: flex;
      flex-direction: column;
    }
    .hero-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 16px;
      position: relative;
      overflow: hidden;
    }
    .hero-section::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 300px;
      height: 300px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      filter: blur(40px);
    }
    .hero-banner {
      position: relative;
      z-index: 1;
      margin-bottom: 16px;
    }
    .hero-banner h1 {
      margin: 0 0 8px;
      font-size: 1.8rem;
      font-weight: 800;
      line-height: 1.3;
      letter-spacing: -0.5px;
    }
    .hero-banner .highlight {
      color: #ffd700;
      display: block;
      text-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .hero-banner p {
      margin: 0;
      font-size: 0.95rem;
      opacity: 0.95;
    }
    .hero-search {
      --background: rgba(255, 255, 255, 0.95);
      --color: #333;
      --icon-color: #667eea;
      border-radius: 12px;
      margin-bottom: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }
    .quick-search {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .quick-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      border-radius: 20px;
      padding: 6px 12px;
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .quick-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }
    .content-wrapper {
      padding: 16px;
      padding-bottom: 40px;
    }
    .search-results-section {
      margin-bottom: 22px;
    }
    .search-meta {
      font-size: 0.85rem;
      font-weight: 700;
      color: #667eea;
      background: #eef1ff;
      border-radius: 999px;
      padding: 6px 10px;
    }
    .search-query-chip {
      display: inline-flex;
      align-items: center;
      margin-bottom: 12px;
      padding: 8px 12px;
      border-radius: 999px;
      background: linear-gradient(135deg, #eef3ff 0%, #f8f3ff 100%);
      color: #4b4f8a;
      font-size: 0.88rem;
      font-weight: 600;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .section-header h2 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 700;
      color: #1a1a1a;
    }
    .hot-deals-section {
      margin-bottom: 20px;
    }
    .deals-scroll {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 8px;
      scroll-behavior: smooth;
    }
    .deal-card {
      flex: 0 0 160px;
      margin: 0;
      border-radius: 14px;
      position: relative;
      border: none;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.12);
      overflow: hidden;
      animation: rise 0.5s ease both;
      transition: transform 0.3s ease;
    }
    .deal-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 32px rgba(102, 126, 234, 0.18);
    }
    .deal-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      z-index: 3;
      box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
    }
    .product-art {
      width: 100%;
      height: 110px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    .art-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 8px;
    }
    .deal-info {
      padding: 10px;
    }
    .brand {
      font-size: 0.75rem;
      color: #888;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .product-name {
      font-size: 0.9rem;
      line-height: 1.2;
      margin: 4px 0;
    }
    .product-unit {
      font-size: 0.8rem;
      color: #999;
      margin-bottom: 6px;
    }
    .price-section {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .original-price {
      text-decoration: line-through;
      color: #999;
      font-size: 0.8rem;
    }
    .sale-price {
      font-weight: 700;
      color: #667eea;
      font-size: 1rem;
    }
    .delivery-badge {
      font-size: 0.75rem;
      color: #667eea;
      font-weight: 600;
    }
    .category-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .category-card {
      margin: 0;
      border-radius: 14px;
      border: none;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      animation: rise 0.45s ease both;
      transition: transform 0.3s ease;
    }
    .category-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(102, 126, 234, 0.15);
    }
    .category-art {
      width: 100%;
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    .category-info {
      padding: 12px;
      background: white;
    }
    .category-name {
      font-weight: 700;
      font-size: 0.95rem;
      color: #1a1a1a;
    }
    .category-count {
      font-size: 0.8rem;
      color: #888;
      margin-top: 2px;
    }
    .product-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .product-card {
      margin: 0;
      border-radius: 14px;
      border: 1px solid #e8eef8;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
      overflow: hidden;
      animation: rise 0.5s ease both;
      transition: all 0.3s ease;
      position: relative;
    }
    .product-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 28px rgba(102, 126, 234, 0.12);
      border-color: #667eea;
    }
    .card-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
      color: white;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      z-index: 2;
      box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
    }
    .product-info {
      padding: 10px;
      background: white;
    }
    .card-actions {
      margin-top: 10px;
    }
    .buy-now-btn {
      width: 100%;
      margin: 0;
      --background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
      --box-shadow: 0 8px 18px rgba(34, 197, 94, 0.24);
      --border-radius: 10px;
      font-weight: 700;
      min-height: 36px;
    }
    .product-brand {
      font-size: 0.75rem;
      color: #888;
      font-weight: 600;
      text-transform: uppercase;
    }
    .price-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .category-preview {
      background: white;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
      border: 1px solid #e8eef8;
      animation: rise 0.45s ease both;
    }
    .category-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f3fa;
    }
    .preview-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .preview-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: #f8f9ff;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .preview-item:hover {
      background: #eff1ff;
      transform: translateX(4px);
    }
    .thumb {
      width: 48px;
      height: 48px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .item-details {
      flex: 1;
      min-width: 0;
    }
    .item-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: #1a1a1a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item-unit {
      font-size: 0.8rem;
      color: #888;
      margin-top: 2px;
    }
    .item-price {
      font-weight: 700;
      color: #667eea;
      white-space: nowrap;
    }
    .empty-small {
      text-align: center;
      color: #999;
      padding: 12px;
      font-size: 0.9rem;
    }
    .search-empty {
      background: white;
      border: 1px dashed #d8def0;
      border-radius: 12px;
      padding: 18px;
    }
    .my-orders-btn {
      margin-top: 20px;
      border-radius: 10px;
      font-weight: 700;
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      height: 48px;
    }
    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .reveal {
      animation: rise 0.45s ease both;
    }
    .error {
      color: #ff6b6b;
      background: #ffe0e0;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 12px;
    }
  `]
})
export class HomePage implements OnInit, OnDestroy {
  readonly searchTerm = signal('');
  readonly categories = signal<any[]>([]);
  readonly products = signal<any[]>([]);
  readonly adding = signal<number | null>(null);
  readonly errorMsg = signal('');
  readonly quickSearches = ['Milk', 'Banana', 'Rice', 'Bread', 'Chips', 'Juice'];
  private destroy$ = new Subject<void>();

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

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
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

  previewProducts(catId: number) {
    return this.filteredProducts().filter(p => p.categoryId === catId).slice(0, 2);
  }

  categoryItemCount(catId: number) {
    return this.filteredProducts().filter(p => p.categoryId === catId).length;
  }

  getHotDeals() {
    return this.products()
      .filter(p => this.getDiscount(p.sellingPrice) > 20)
      .sort((a, b) => this.getDiscount(b.sellingPrice) - this.getDiscount(a.sellingPrice))
      .slice(0, 6);
  }

  getDiscount(sellingPrice: number) {
    const basePrice = sellingPrice * 1.3;
    return Math.round(((basePrice - sellingPrice) / basePrice) * 100);
  }

  getOriginalPrice(sellingPrice: number) {
    return Math.round(sellingPrice * 1.3);
  }

  getBrandName(productName: string) {
    const words = productName.split(' ');
    return words[0] || 'Fresh';
  }

  buyNow(productId: number) {
    this.adding.set(productId);
    this.api.post('/customer/cart/items', { productId, quantity: 1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.adding.set(null);
          this.router.navigateByUrl('/cart');
        },
        error: () => {
          this.adding.set(null);
          this.errorMsg.set('Could not start checkout right now');
        }
      });
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


import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { Router, RouterLink } from '@angular/router';
import { CartState } from '../../core/state/cart.state';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';
import { ActivityState } from '../../core/state/activity.state';
import { LocationService } from '../../core/services/location.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { App } from '@capacitor/app';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, BottomNavComponent],
  template: `
    <!-- ═══════════════════════════════════════
         STICKY HEADER
    ═══════════════════════════════════════ -->
    <ion-header>
      <ion-toolbar class="hdr-toolbar">
        <!-- Single row: Logo left | Deliver To + Bell right -->
        <div class="hdr-main-row">
          <div class="hdr-logo-wrap">
            <span class="logo-leaf">🛵</span>
            <div class="logo-text-wrap">
              <span class="logo-text"><span class="logo-o">Order</span><span class="logo-k">Kro</span></span>
              <span class="logo-tagline">Sabse sasta, sabse tez</span>
            </div>
          </div>
          <div class="hdr-right">
            <div class="hdr-deliver" (click)="goToProfile()">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#667eea"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <div class="hdr-deliver-inner">
                <span class="hdr-deliver-label">Deliver To</span>
                <span class="hdr-deliver-text">{{ shortDeliveryLabel() }}</span>
              </div>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#999"><path d="M7 10l5 5 5-5z"/></svg>
            </div>
            <button class="hdr-bell-btn" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
          </div>
        </div>
      </ion-toolbar>
      <!-- Search bar row -->
      <ion-toolbar class="search-toolbar">
        <div class="search-bar">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="search-input" type="text" placeholder="Search groceries, fruits, vegetables, chai, snacks…"
            [value]="searchTerm()"
            (input)="searchTerm.set($any($event).target.value || '')"
            (keyup.enter)="submitSearch(searchTerm())"/>
          <button *ngIf="speechSupported" class="mic-btn" aria-label="Voice" (click)="startVoiceSearch()" [class.mic-active]="isListening()">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content [scrollEvents]="true" [fullscreen]="false" class="home-content"
      style="--padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px))">

      <div class="error-banner-top" *ngIf="errorMsg()">{{ errorMsg() }}</div>

      <!-- ═══════════════════════════════════════
           SEARCH RESULTS MODE
      ═══════════════════════════════════════ -->
      <div *ngIf="hasSearchTerm()" class="browse-pad">
        <div class="section-row">
          <h3 class="section-title">Results for "{{ searchTerm().trim() }}"</h3>
          <span class="item-count">{{ filteredProducts().length }} items</span>
        </div>
        <div class="prod-grid" *ngIf="filteredProducts().length > 0; else noSearchResults">
          <div class="prod-card" *ngFor="let p of filteredProducts().slice(0,24); let i = index"
            [style.animationDelay.ms]="i*30" [routerLink]="['/products']" [queryParams]="{ query: p.name }">
            <div class="disc-badge" *ngIf="getDiscount(p) > 0">{{ getDiscount(p) }}%</div>
            <div class="prod-img-wrap" [style.background]="p.imageUrl ? '#f8f9f0' : productBg(p)">
              <img *ngIf="p.imageUrl" class="prod-img" [src]="p.imageUrl" [alt]="p.name">
            </div>
            <div class="prod-body">
              <div class="prod-name">{{ p.name }}</div>
              <div class="prod-unit">{{ scaledUnit(p.unit, cartQty(p.id)) }}</div>
              <div class="prod-price-row">
                <span class="prod-mrp" *ngIf="getDiscount(p) > 0">₹{{ getOriginalPrice(p) }}</span>
                <span class="prod-price">₹{{ p.sellingPrice }}</span>
              </div>
              <div class="prod-actions" (click)="$event.stopPropagation()">
                <ng-container *ngIf="cartQty(p.id) === 0; else srchStep">
                  <button class="add-btn-flat" (click)="addToCart(p)">+ Add</button>
                </ng-container>
                <ng-template #srchStep>
                  <div class="stepper"><button class="step-btn" (click)="removeFromCart(p)">−</button><span class="step-qty">{{ cartQty(p.id) }}</span><button class="step-btn" (click)="addToCart(p)">+</button></div>
                </ng-template>
              </div>
            </div>
          </div>
        </div>
        <ng-template #noSearchResults>
          <div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No items found</div><div class="empty-sub">Try "milk", "chai" or "samosa"</div></div>
        </ng-template>
      </div>

      <!-- ═══════════════════════════════════════
           BROWSE MODE
      ═══════════════════════════════════════ -->
      <ng-container *ngIf="!hasSearchTerm()">

        <!-- ══════════════════════════════════════════════════
             HERO BANNER — custom banner image
        ══════════════════════════════════════════════════ -->
        <div class="ok-hero">
          <!-- full-bleed banner image -->
          <img class="ok-hero-bg-img" src="assets/home-banner.png" alt="OrderKro Banner">
          <!-- dark overlay so text stays readable -->
          <div class="ok-hero-overlay"></div>
          <!-- fireworks bursts -->
          <div class="fw-wrap">
            <div class="fw fw1"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
            <div class="fw fw2"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
            <div class="fw fw3"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
          </div>
          <!-- bottom badge only -->
          <div class="ok-hero-text">
            <div class="ok-hero-badge">⚡ 15–30 min delivery</div>
          </div>
        </div>

        <!-- ── FEATURE STRIP ── -->
        <!-- CATEGORY CHIPS -->
        <div class="cat-strip-sticky">
        <div class="cat-strip">
          <button class="cat-chip chip-fv" [class.active]="activeCategorySlug()==='fruits-vegetables'" (click)="selectChip('fruits-vegetables')">🥦 Fruits & Veg</button>
          <button class="cat-chip chip-gr" [class.active]="activeCategorySlug()==='groceries'" (click)="selectChip('groceries')">🛒 Groceries</button>
          <button class="cat-chip chip-sn" [class.active]="activeCategorySlug()==='snacks'" (click)="selectChip('snacks')">🍿 Snacks</button>
          <button class="cat-chip chip-fd" [class.active]="activeCategorySlug()==='food'" (click)="selectChip('food')">🍽️ Food</button>
        </div>
        </div>







        <!-- ── CATEGORY STRIP (pills) + ALL / FILTERED PRODUCTS ── -->
        <!-- Clear filter bar when chip is active -->
        <div class="chip-filter-bar" *ngIf="selectedCategorySlug()">
          <ng-container *ngIf="isFoodMode()">
            <ng-container *ngIf="selectedRestaurantId() !== null; else restListBar">
              <button class="chip-back-btn" (click)="backToRestaurants()">← Back</button>
              <span class="chip-filter-label"><strong>{{ selectedRestaurantName() }}</strong> Menu</span>
            </ng-container>
            <ng-template #restListBar>
              <span class="chip-filter-label">🍽️ <strong>Nearby Restaurants</strong></span>
            </ng-template>
          </ng-container>
          <ng-container *ngIf="!isFoodMode()">
            <span class="chip-filter-label">Showing: <strong>{{ activeCategoryName() }}</strong></span>
          </ng-container>
          <button class="chip-filter-clear" (click)="clearChipFilter()">✕ Clear</button>
        </div>

        <!-- ── RESTAURANT LISTING — shown when Food chip active, no restaurant selected ── -->
        <div class="browse-pad" *ngIf="isFoodMode() && selectedRestaurantId() === null">
          <div class="section-row">
            <h3 class="section-title">🍽️ Nearby Restaurants</h3>
            <span class="item-count">{{ restaurants().length }} open</span>
          </div>
          <div class="restaurant-grid">
            <div class="restaurant-card" *ngFor="let r of restaurants()" (click)="selectRestaurant(r)">
              <div class="restaurant-card-img-wrap">
                <img class="restaurant-card-img" [src]="restaurantImage(r)" [alt]="r.name" loading="eager">
                <span class="restaurant-time-badge">⏱ {{ r.deliveryTimeMin }} min</span>
              </div>
              <div class="restaurant-card-body">
                <div class="restaurant-card-name">{{ r.name }}</div>
                <div class="restaurant-card-cuisine">{{ r.cuisineType }}</div>
                <div class="restaurant-card-meta">
                  <span class="restaurant-rating">⭐ {{ r.rating }}</span>
                  <span class="restaurant-open-dot"></span>
                  <span class="restaurant-open-label">Open</span>
                  <span class="restaurant-dist" *ngIf="r.distanceKm != null">• {{ r.distanceKm }} km</span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="restaurants().length === 0" class="empty-state">
            <div class="empty-icon">🍽️</div>
            <div class="empty-title">No restaurants within 5 km</div>
            <div class="empty-sub">Enable location for accurate results</div>
          </div>
        </div>

        <!-- ── RESTAURANT MENU — shown when a restaurant is selected ── -->
        <div class="browse-pad" id="menu-section" *ngIf="isFoodMode() && selectedRestaurantId() !== null">
          <div class="section-row">
            <h3 class="section-title">Menu</h3>
            <span class="item-count">{{ restaurantMenuItems().length }} items</span>
          </div>
          <div class="prod-grid" *ngIf="restaurantMenuItems().length > 0; else noMenuItems">
            <div class="prod-card" *ngFor="let p of restaurantMenuItems(); let i = index" [style.animationDelay.ms]="i*20">
              <div class="disc-badge" *ngIf="getDiscount(p) > 0">{{ getDiscount(p) }}%</div>
              <div class="prod-img-wrap" [style.background]="p.imageUrl ? '#fff8f0' : productBg(p)">
                <img *ngIf="p.imageUrl" class="prod-img" [src]="p.imageUrl" [alt]="p.name">
              </div>
              <div class="prod-body">
                <div class="prod-name">{{ p.name }}</div>
                <div class="prod-unit">{{ p.unit }}</div>
                <div class="prod-price-row">
                  <span class="prod-mrp" *ngIf="getDiscount(p) > 0">₹{{ getOriginalPrice(p) }}</span>
                  <span class="prod-price">₹{{ p.sellingPrice }}</span>
                </div>
                <div class="prod-actions" (click)="$event.stopPropagation()">
                  <ng-container *ngIf="cartQty(p.id) === 0; else menuStep">
                    <button class="add-btn-flat" (click)="addToCart(p)">+ Add</button>
                  </ng-container>
                  <ng-template #menuStep>
                    <div class="stepper"><button class="step-btn" (click)="removeFromCart(p)">−</button><span class="step-qty">{{ cartQty(p.id) }}</span><button class="step-btn" (click)="addToCart(p)">+</button></div>
                  </ng-template>
                </div>
              </div>
            </div>
          </div>
          <ng-template #noMenuItems>
            <div class="empty-state"><div class="empty-icon">🍽️</div><div class="empty-title">Menu coming soon</div></div>
          </ng-template>
        </div>

        <div class="browse-pad" id="prod-section" *ngIf="!isFoodMode()">
          <div class="section-row">
            <h3 class="section-title" *ngIf="selectedCategoryId() === null">✨ All Products</h3>
            <h3 class="section-title" *ngIf="selectedCategoryId() !== null">{{ catEmoji(activeCategorySlug()) }} {{ activeCategoryName() }}</h3>
            <span class="item-count">{{ (selectedCategoryId() === null ? allProducts() : categoryProducts()).length }} items</span>
          </div>

          <div class="prod-grid" *ngIf="(selectedCategoryId() === null ? allProducts() : categoryProducts()).length > 0; else noItems">
            <div class="prod-card"
              *ngFor="let p of (selectedCategoryId() === null ? allProducts().slice(0,40) : categoryProducts()); let i = index"
              [style.animationDelay.ms]="i*20"
              [routerLink]="['/products']" [queryParams]="{ query: p.name }">
              <div class="disc-badge" *ngIf="getDiscount(p) > 0">{{ getDiscount(p) }}%</div>
              <div class="prod-img-wrap" [style.background]="p.imageUrl ? '#f8f9f0' : productBg(p)">
                <img *ngIf="p.imageUrl" class="prod-img" [src]="p.imageUrl" [alt]="p.name">
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
                  <ng-container *ngIf="cartQty(p.id) === 0; else allStep">
                    <button class="add-btn-flat" (click)="addToCart(p)">+ Add</button>
                  </ng-container>
                  <ng-template #allStep>
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

      </ng-container>
    </ion-content>
    <app-bottom-nav></app-bottom-nav>
  `,
  styles: [`
    /* ══════════════════════════════════════
       HEADER
    ══════════════════════════════════════ */
    ion-header { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .hdr-toolbar {
      --background: #fff;
      --padding-start: 0;
      --padding-end: 0;
      --min-height: 0;
    }
    .hdr-toolbar::part(native) {
      display: block;
      padding-top: env(safe-area-inset-top, 0px);
      padding-left: 0;
      padding-right: 0;
      padding-bottom: 0;
      min-height: 0;
    }
    /* Single main row */
    .hdr-main-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 10px;
    }
    .hdr-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hdr-logo-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .logo-text-wrap {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    /* Bouncing leaf */
    .logo-leaf {
      font-size: 1.3rem;
      line-height: 1;
      display: inline-block;
      animation: scooter-ride 1.4s ease-in-out infinite;
      transform-origin: center bottom;
    }
    @keyframes scooter-ride {
      0%   { transform: translateY(0px) rotate(0deg); }
      20%  { transform: translateY(-3px) rotate(-4deg); }
      40%  { transform: translateY(0px) rotate(0deg); }
      60%  { transform: translateY(-2px) rotate(-3deg); }
      80%  { transform: translateY(0px) rotate(0deg); }
      100% { transform: translateY(0px) rotate(0deg); }
    }
    /* "Order" — animated gradient sweep */
    .logo-text {
      font-size: 1.45rem;
      font-weight: 900;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .logo-o {
      background: linear-gradient(90deg, #1a1a1a 0%, #667eea 40%, #1a1a1a 80%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: logo-shimmer 3s linear infinite;
    }
    /* "Kro" — pulsing purple glow */
    .logo-k {
      color: #667eea;
      display: inline-block;
      animation: logo-glow 2s ease-in-out infinite alternate;
      text-shadow: 0 0 8px rgba(102,126,234,0.5);
    }
    @keyframes logo-shimmer {
      0%   { background-position: 200% center; }
      100% { background-position: -200% center; }
    }
    @keyframes logo-glow {
      from { text-shadow: 0 0 4px rgba(102,126,234,0.3); color: #667eea; }
      to   { text-shadow: 0 0 14px rgba(102,126,234,0.9); color: #818cf8; }
    }
    /* Tagline — typewriter fade-in on load */
    .logo-tagline {
      font-size: 0.55rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      line-height: 1;
      background: linear-gradient(90deg, #f59e0b, #ef4444, #667eea, #10b981);
      background-size: 300% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: tagline-gradient 4s linear infinite;
    }
    @keyframes tagline-gradient {
      0%   { background-position: 0% center; }
      100% { background-position: 300% center; }
    }
    .hdr-deliver {
      display: flex;
      align-items: center;
      gap: 3px;
      cursor: pointer;
    }
    .hdr-deliver-inner {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .hdr-deliver-label {
      font-size: 0.58rem;
      font-weight: 500;
      color: #aaa;
      line-height: 1;
    }
    .hdr-deliver-text {
      font-size: 0.73rem;
      font-weight: 700;
      color: #1a1a1a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100px;
      line-height: 1;
    }
    .hdr-bell-btn {
      position: relative;
      background: #f5f6fa;
      border: none;
      border-radius: 10px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      padding: 0;
    }
    .hdr-bell-btn:active { background: #eaeef8; }
    .hdr-btn {
      position: relative;
      background: #f5f6fa;
      border: none;
      border-radius: 10px;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }
    .hdr-btn:active { background: #eaeef8; }
    .hdr-badge {
      position: absolute;
      top: 4px; right: 4px;
      min-width: 14px; height: 14px;
      border-radius: 7px;
      font-size: 0.5rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
      line-height: 1;
      pointer-events: none;
      border: 1.5px solid #fff;
    }
    .hdr-badge.red { background: #ef4444; color: #fff; }
    .mic-btn { background: transparent; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; }
    .mic-active svg { stroke: #ef4444; animation: pulse 0.8s infinite alternate; }
    @keyframes pulse { from { opacity: 1; } to { opacity: 0.4; } }
    /* Search toolbar */
    .search-toolbar {
      --background: #fff;
      --padding-start: 14px;
      --padding-end: 14px;
      --min-height: 52px;
    }
    .search-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f5f6fa;
      border: 1.5px solid #e8ecf4;
      border-radius: 14px;
      padding: 9px 14px;
      transition: border-color 0.18s, box-shadow 0.18s;
    }
    .search-bar:focus-within {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
      background: #fff;
    }
    .search-input {
      flex: 1; border: none; outline: none;
      background: transparent;
      font-size: 0.87rem; color: #1a1a1a; font-weight: 500; min-width: 0;
    }
    .search-input::placeholder { color: #bbb; font-weight: 400; }
    .mic-btn { background: transparent; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; flex-shrink: 0; }
    /* ══════════════════════════════════════
       CONTENT
    ══════════════════════════════════════ */
    .home-content { --background: #f5f6fa; }
    .error-banner-top {
      margin: 10px 14px 0; padding: 10px 14px;
      background: #ffebee; color: #c62828;
      border-radius: 10px; font-size: 0.85rem;
      border-left: 3px solid #c62828;
    }
    /* ── fireworks burst ── */
    .fw-wrap {
      position: absolute; inset: 0; z-index: 3; pointer-events: none; overflow: hidden;
    }
    .fw {
      position: absolute;
      width: 0; height: 0;
    }
    .fw1 { top: 28%; left: 22%; animation-delay: 0s; }
    .fw2 { top: 20%; left: 62%; animation-delay: 1.1s; }
    .fw3 { top: 38%; left: 80%; animation-delay: 2.2s; }
    .fw span {
      position: absolute;
      width: 5px; height: 5px;
      border-radius: 50%;
      animation: spark 1.8s ease-out infinite;
      opacity: 0;
    }
    /* 8 sparks per burst — evenly spread 360° */
    .fw span:nth-child(1) { background:#ff4d6d; animation-delay: inherit; transform-origin: 0 0; --dx:0px;   --dy:-38px; }
    .fw span:nth-child(2) { background:#ffd60a; animation-delay: inherit; --dx:27px;  --dy:-27px; }
    .fw span:nth-child(3) { background:#06d6a0; animation-delay: inherit; --dx:38px;  --dy:0px;   }
    .fw span:nth-child(4) { background:#ff6b35; animation-delay: inherit; --dx:27px;  --dy:27px;  }
    .fw span:nth-child(5) { background:#c77dff; animation-delay: inherit; --dx:0px;   --dy:38px;  }
    .fw span:nth-child(6) { background:#4cc9f0; animation-delay: inherit; --dx:-27px; --dy:27px;  }
    .fw span:nth-child(7) { background:#ff4d6d; animation-delay: inherit; --dx:-38px; --dy:0px;   }
    .fw span:nth-child(8) { background:#ffd60a; animation-delay: inherit; --dx:-27px; --dy:-27px; }
    @keyframes spark {
      0%   { transform: translate(0,0) scale(1);   opacity: 1; }
      60%  { opacity: 0.8; }
      100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
    }
    /* stagger each span slightly within the burst */
    .fw span:nth-child(1) { animation-duration: 1.6s; }
    .fw span:nth-child(2) { animation-duration: 1.9s; }
    .fw span:nth-child(3) { animation-duration: 1.7s; }
    .fw span:nth-child(4) { animation-duration: 2.0s; }
    .fw span:nth-child(5) { animation-duration: 1.5s; }
    .fw span:nth-child(6) { animation-duration: 1.8s; }
    .fw span:nth-child(7) { animation-duration: 1.6s; }
    .fw span:nth-child(8) { animation-duration: 1.9s; }
    /* fw2 & fw3 burst at different times via parent delay trick */
    .fw2 span { animation-delay: 1.1s !important; }
    .fw3 span { animation-delay: 2.2s !important; }

    /* ══════════════════════════════════════
       HERO BANNER — custom image with overlay text
    ══════════════════════════════════════ */
    .ok-hero {
      margin: 12px 14px 8px;
      border-radius: 24px;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: flex-end;
    }
    /* full-bleed banner image — natural height, no crop */
    .ok-hero-bg-img {
      display: block;
      width: 100%;
      height: auto;
      object-fit: contain;
    }
    /* gradient overlay — bottom strip only */
    .ok-hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to top,
        rgba(4,20,12,0.75) 0%,
        rgba(4,20,12,0.2) 35%,
        transparent 60%
      );
      pointer-events: none;
    }
    /* ── text col ── */
    .ok-hero-text {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 2;
      padding: 14px 18px 12px;
    }
    .ok-hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(52,211,153,0.22);
      border: 1.5px solid rgba(52,211,153,0.55);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 30px;
      padding: 4px 12px;
      font-size: 0.65rem;
      font-weight: 800;
      color: #6ee7b7;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .ok-hero-tagline {
      margin: 0;
      font-size: 1.18rem;
      font-weight: 900;
      color: #fff;
      line-height: 1.35;
      text-shadow: 0 2px 10px rgba(0,0,0,0.6);
      letter-spacing: -0.01em;
    }
    .ok-tagline-accent {
      color: #6ee7b7;
      font-style: italic;
    }
    .ok-trust-row { display: flex; flex-wrap: wrap; gap: 10px; }
    .ok-trust { font-size: 0.6rem; font-weight: 600; color: rgba(209,250,229,0.85);   padding: 2px 7px;
      border-radius: 20px;
      backdrop-filter: blur(4px);
    }
    .dish-body { padding: 9px 10px 11px; }
    .dish-name { font-size: 0.82rem; font-weight: 800; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
    .dish-sub  { font-size: 0.62rem; font-weight: 500; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 8px; }
    .dish-add-btn {
      width: 100%; padding: 6px 0;
      border: 2px solid #16a34a; background: #f0fdf4;
      color: #16a34a; font-size: 0.75rem; font-weight: 800;
      border-radius: 10px; cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .dish-add-btn:active { background: #16a34a; color: #fff; }
    /* ══════════════════════════════════════
       CATEGORY CHIPS — animated
    ══════════════════════════════════════ */
    .cat-strip-sticky {
      position: sticky;
      top: 0;
      z-index: 200;
      background: #f5f6fa;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    }
    .cat-strip {
      display: flex;
      gap: 8px;
      padding: 10px 14px 8px;
    }
    /* Base chip */
    .cat-chip {
      position: relative;
      flex: 1;
      min-width: 0;
      border: none;
      border-radius: 30px;
      padding: 9px 2px;
      font-size: 0.68rem;
      font-weight: 800;
      cursor: pointer;
      letter-spacing: 0.01em;
      overflow: hidden;
      text-align: center;
      white-space: nowrap;
      /* slide-in from bottom on load */
      animation: chip-slide-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both,
                 chip-float 3s ease-in-out infinite 0.6s;
      transition: transform 0.15s, box-shadow 0.2s, filter 0.2s;
    }
    @keyframes chip-slide-in {
      from { opacity: 0; transform: translateY(18px) scale(0.85); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }
    @keyframes chip-float {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-3px); }
    }
    .cat-chip:active { transform: scale(0.93) !important; }
    /* Staggered delays */
    .chip-fv { animation-delay: 0s,    0.8s; }
    .chip-gr { animation-delay: 0.08s, 1.1s; }
    .chip-sn { animation-delay: 0.16s, 1.4s; }
    .chip-fd { animation-delay: 0.24s, 1.7s; }
    /* Individual colour themes */
    .chip-fv {
      background: linear-gradient(135deg, #d1fae5, #a7f3d0);
      color: #065f46;
      box-shadow: 0 3px 10px rgba(16,185,129,0.25);
    }
    .chip-fv::after {
      content: '';
      position: absolute; bottom: 0; left: 0; right: 0; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
      background-size: 200% 100%;
      animation: chip-sheen 2.8s linear infinite;
      pointer-events: none;
    }
    .chip-gr {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      color: #92400e;
      box-shadow: 0 3px 10px rgba(245,158,11,0.25);
    }
    .chip-gr::after {
      content: '';
      position: absolute; bottom: 0; left: 0; right: 0; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
      background-size: 200% 100%;
      animation: chip-sheen 2.8s linear infinite 0.7s;
      pointer-events: none;
    }
    .chip-sn {
      background: linear-gradient(135deg, #fee2e2, #fca5a5);
      color: #991b1b;
      box-shadow: 0 3px 10px rgba(239,68,68,0.22);
    }
    .chip-sn::after {
      content: '';
      position: absolute; bottom: 0; left: 0; right: 0; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
      background-size: 200% 100%;
      animation: chip-sheen 2.8s linear infinite 1.4s;
      pointer-events: none;
    }
    .chip-fd {
      background: linear-gradient(135deg, #ede9fe, #c4b5fd);
      color: #4c1d95;
      box-shadow: 0 3px 10px rgba(139,92,246,0.25);
    }
    .chip-fd::after {
      content: '';
      position: absolute; bottom: 0; left: 0; right: 0; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
      background-size: 200% 100%;
      animation: chip-sheen 2.8s linear infinite 2.1s;
      pointer-events: none;
    }
    @keyframes chip-sheen {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    /* Active states — solid + glow */
    .chip-fv.active { background: linear-gradient(135deg,#059669,#10b981); color:#fff; box-shadow: 0 4px 15px rgba(16,185,129,0.5); filter: brightness(1.05); }
    .chip-gr.active { background: linear-gradient(135deg,#d97706,#f59e0b); color:#fff; box-shadow: 0 4px 15px rgba(245,158,11,0.5); filter: brightness(1.05); }
    .chip-sn.active { background: linear-gradient(135deg,#dc2626,#ef4444); color:#fff; box-shadow: 0 4px 15px rgba(239,68,68,0.5);  filter: brightness(1.05); }
    .chip-fd.active { background: linear-gradient(135deg,#7c3aed,#8b5cf6); color:#fff; box-shadow: 0 4px 15px rgba(139,92,246,0.5); filter: brightness(1.05); }
    /* kill old shimmer-underline on active */
    .cat-chip.active::after { animation: chip-sheen 2.8s linear infinite; }
    /* ══════════════════════════════════════
       SECTION SHARED
    ══════════════════════════════════════ */
    .section-pad { padding: 14px 14px 0; }
    .section-row { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
    .section-title { margin: 0; font-size: 1.05rem; font-weight: 800; color: #1a1a1a; }
    .section-sub { margin: 2px 0 0; font-size: 0.75rem; color: #888; font-weight: 500; }
    .see-all-btn {
      background: #eef1ff; border: none; color: #667eea;
      font-size: 0.75rem; font-weight: 700;
      padding: 5px 12px; border-radius: 20px; cursor: pointer;
      flex-shrink: 0; align-self: center;
    }
    .item-count {
      font-size: 0.78rem; color: #888; font-weight: 600;
      background: #f0f0f0; border-radius: 20px; padding: 3px 8px;
      flex-shrink: 0; align-self: center;
    }
    /* ══════════════════════════════════════
       FOOD CAROUSEL (time-based)
    ══════════════════════════════════════ */
    .food-carousel-outer {
      overflow: hidden;
      border-radius: 16px;
    }
    .food-carousel-track {
      display: flex;
      gap: 10px;
      transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      padding-bottom: 4px;
    }
    .food-card {
      flex-shrink: 0;
      width: 138px;
      background: #fff;
      border-radius: 16px;
      border: 1px solid #e8ecf4;
      overflow: hidden;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      transition: transform 0.18s, box-shadow 0.18s;
    }
    .food-card:active { transform: scale(0.96); }
    .food-card-img-wrap {
      position: relative;
      width: 100%;
      height: 100px;
      overflow: hidden;
    }
    .food-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .food-card-tag-pill {
      position: absolute;
      top: 6px;
      left: 6px;
      background: rgba(102,126,234,0.9);
      color: #fff;
      font-size: 0.58rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 20px;
    }
    .food-card-body {
      padding: 8px 10px 10px;
    }
    .food-card-name { font-size: 0.82rem; font-weight: 700; color: #1a1a1a; line-height: 1.2; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .food-order-btn { width: 100%; padding: 5px 0; background: #667eea; border: none; border-radius: 8px; color: #fff; font-size: 0.72rem; font-weight: 700; cursor: pointer; }
    .food-order-btn:active { opacity: 0.85; }
    .carousel-dots { display: flex; justify-content: center; gap: 6px; margin-top: 10px; }
    .cdot { width: 6px; height: 6px; border-radius: 3px; background: #ddd; cursor: pointer; transition: all 0.2s; }
    .cdot.active { background: #667eea; width: 18px; border-radius: 3px; }
    /* ══════════════════════════════════════
       CATEGORY CARDS
    ══════════════════════════════════════ */
    .cat-cards-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .cat-card {
      background: #fff;
      border: 1px solid #e8ecf4;
      border-radius: 14px;
      overflow: hidden;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .cat-card:active { transform: scale(0.95); }
    .cat-card-img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
    .cat-card-name { font-size: 0.62rem; font-weight: 700; color: #444; text-align: center; padding: 5px 4px 6px; line-height: 1.2; }
    /* ══════════════════════════════════════
       HOT DEALS
    ══════════════════════════════════════ */
    .deals-row { display: flex; flex-direction: column; gap: 8px; }
    .deal-chip {
      display: flex; align-items: center;
      background: #fff; border-radius: 14px;
      padding: 10px 12px; gap: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      cursor: pointer; border: 1px solid #e8ecf4;
    }
    .deal-chip-img { width: 54px; height: 54px; object-fit: contain; border-radius: 8px; background: #f8f9fa; flex-shrink: 0; }
    .deal-chip-body { flex: 1; min-width: 0; }
    .deal-chip-name { font-weight: 700; font-size: 0.9rem; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .deal-chip-unit { font-size: 0.73rem; color: #888; margin: 1px 0 4px; }
    .deal-chip-prices { display: flex; align-items: center; gap: 6px; }
    .deal-chip-mrp { text-decoration: line-through; color: #bbb; font-size: 0.75rem; }
    .deal-chip-price { font-weight: 800; color: #16a34a; font-size: 1rem; }
    .deal-chip-badge { background: linear-gradient(135deg,#ff6b6b,#ee5a6f); color: #fff; border-radius: 8px; padding: 4px 6px; font-size: 0.68rem; font-weight: 800; text-align: center; line-height: 1.3; flex-shrink: 0; }
    .deal-chip-action { flex-shrink: 0; }
    /* ══════════════════════════════════════
       CATEGORY STRIP PILLS
    ══════════════════════════════════════ */
    .chip-filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 6px;
    }
    .chip-filter-label { font-size: 0.82rem; color: #444; font-weight: 500; }
    .chip-filter-label strong { color: #064e3b; font-weight: 800; }
    .chip-filter-clear {
      background: #fff0f0; border: 1px solid #fca5a5;
      color: #dc2626; font-size: 0.75rem; font-weight: 700;
      padding: 4px 12px; border-radius: 20px; cursor: pointer;
    }
    .cat-strip-wrap { background: #fff; border-bottom: 1px solid #eee; padding: 10px 0 8px; position: sticky; top: 0; z-index: 100; margin-top: 14px; }
    .cat-strip { display: flex; gap: 8px; overflow-x: auto; padding: 0 14px; scrollbar-width: none; }
    .cat-strip::-webkit-scrollbar { display: none; }
    .cat-pill { display: flex; flex-direction: column; align-items: center; gap: 4px; background: #f5f6fa; border: 1.5px solid #e8ecf4; border-radius: 12px; padding: 8px 10px; cursor: pointer; flex-shrink: 0; min-width: 62px; transition: all 0.18s; }
    .cat-pill.active { background: #eef1ff; border-color: #667eea; }
    .cat-emoji { font-size: 1.4rem; line-height: 1; }
    .cat-name { font-size: 0.65rem; font-weight: 700; color: #555; white-space: nowrap; text-align: center; line-height: 1.2; }
    .cat-pill.active .cat-name { color: #667eea; }
    /* ══════════════════════════════════════
       PRODUCT GRID
    ══════════════════════════════════════ */
    .browse-pad { padding: 14px 14px 20px; }
    .prod-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .prod-card { background: #fff; border-radius: 14px; border: 1px solid #e8ecf4; overflow: hidden; position: relative; cursor: pointer; animation: rise 0.4s ease both; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; flex-direction: column; }
    .disc-badge { position: absolute; top: 7px; right: 7px; background: linear-gradient(135deg,#ff6b6b,#ee5a6f); color: #fff; border-radius: 6px; padding: 2px 6px; font-size: 0.68rem; font-weight: 800; z-index: 2; }
    .prod-img-wrap { width: 100%; height: 100px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .prod-img { width: 100%; height: 100%; object-fit: contain; padding: 6px; }
    .prod-body { padding: 8px 10px 10px; flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .prod-cat-tag { font-size: 0.62rem; font-weight: 700; color: #667eea; text-transform: uppercase; letter-spacing: 0.3px; }
    .prod-name { font-size: 0.86rem; font-weight: 700; color: #1a1a1a; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .prod-unit { font-size: 0.73rem; color: #999; }
    .prod-price-row { display: flex; align-items: center; gap: 5px; margin: 2px 0 6px; }
    .prod-mrp { text-decoration: line-through; color: #bbb; font-size: 0.73rem; }
    .prod-price { font-weight: 800; color: #1a1a1a; font-size: 1rem; }
    .prod-actions { margin-top: auto; }
    .add-btn-flat { width: 100%; padding: 7px 0; background: #fff; border: 1.5px solid #667eea; border-radius: 8px; color: #667eea; font-size: 0.8rem; font-weight: 800; cursor: pointer; transition: background 0.15s; }
    .add-btn-flat:active { background: #eef1ff; }
    .stepper { display: flex; align-items: stretch; background: #667eea; border-radius: 8px; overflow: hidden; height: 32px; }
    .stepper-xs { height: 28px; border-radius: 7px; }
    .step-btn { background: transparent; border: none; color: #fff; font-size: 1.1rem; font-weight: 700; width: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
    .step-qty { color: #fff; font-weight: 700; font-size: 0.9rem; flex: 1; text-align: center; display: flex; align-items: center; justify-content: center; }
    .empty-state { text-align: center; padding: 40px 20px; }
    .empty-icon { font-size: 2.5rem; margin-bottom: 10px; }
    .empty-title { font-weight: 700; font-size: 1rem; color: #444; }
    .empty-sub { font-size: 0.83rem; color: #888; margin-top: 4px; }
    @keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    /* ══════════════════════════════════════
       RESTAURANT CARDS
    ══════════════════════════════════════ */
    .restaurant-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .restaurant-card {
      background: #fff;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .restaurant-card:active { transform: scale(0.97); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
    .restaurant-card-img-wrap {
      position: relative;
      width: 100%;
      padding-top: 62%;
      overflow: hidden;
      background: #f3f4f6;
    }
    .restaurant-card-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .restaurant-time-badge {
      position: absolute;
      bottom: 6px;
      right: 7px;
      background: rgba(0,0,0,0.6);
      color: #fff;
      font-size: 0.6rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 20px;
      backdrop-filter: blur(4px);
    }
    .restaurant-card-body { padding: 8px 10px 10px; }
    .restaurant-card-name { font-size: 0.82rem; font-weight: 800; color: #1a1a1a; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .restaurant-card-cuisine { font-size: 0.65rem; font-weight: 500; color: #888; margin-bottom: 5px; }
    .restaurant-card-meta { display: flex; align-items: center; gap: 5px; }
    .restaurant-rating { font-size: 0.65rem; font-weight: 700; color: #1a1a1a; }
    .restaurant-open-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; flex-shrink: 0; }
    .restaurant-open-label { font-size: 0.6rem; font-weight: 600; color: #16a34a; }
    .restaurant-dist { font-size: 0.6rem; font-weight: 600; color: #888; }
    /* chip-back-btn */
    .chip-back-btn {
      background: none;
      border: none;
      color: #667eea;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0;
      margin-right: 6px;
      cursor: pointer;
    }
  `]
})
export class HomePage implements OnInit, OnDestroy {
  readonly searchTerm = signal('');
  readonly categories = signal<any[]>([]);
  readonly products = signal<any[]>([]);
  readonly allProducts = signal<any[]>([]); // master list, never mutated after load
  readonly adding = signal<number | null>(null);
  readonly errorMsg = signal('');
  readonly quickSearches = ['Milk', 'Banana', 'Rice', 'Bread', 'Chips', 'Juice'];
  readonly selectedCategoryId = signal<number | null>(null);
  readonly selectedCategorySlug = signal<string | null>(null);
  readonly showMenu = signal(false);
  readonly isListening = signal(false);
  readonly speechSupported = true;
  readonly restaurants = signal<any[]>([]);
  readonly selectedRestaurantId = signal<number | null>(null);
  readonly selectedRestaurantName = signal<string>('');
  readonly restaurantMenuItems = signal<any[]>([]);
  readonly isFoodMode = computed(() => this.selectedCategorySlug() === 'food');
  // food carousel

  private destroy$ = new Subject<void>();
  private backButtonListener: any;

  // ── Feature strip data ──
  readonly featureItems = [
    { icon: '⚡', label: 'Fast Delivery' },
    { icon: '💰', label: 'Best Price' },
    { icon: '🌿', label: 'Fresh Quality' },
    { icon: '📦', label: 'Safe Packing' },
    { icon: '🏘️', label: 'Local Store' },
  ];

  // ── Category quick cards ──
  readonly categoryCards = [
    { name: 'Grocery',    img: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Khyma_and_Basmati_rice.jpg',                                                                                  categorySlug: 'groceries' },
    { name: 'Vegetables', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/240px-Tomato_je.jpg',                                                                     categorySlug: 'fruits-vegetables' },
    { name: 'Fruits',     img: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Bananavarieties.jpg',                                                                                         categorySlug: 'fruits-vegetables' },
    { name: 'Dairy',      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Dairy_Crest_Semi_Skimmed_Milk_Bottle.jpg/240px-Dairy_Crest_Semi_Skimmed_Milk_Bottle.jpg',              categorySlug: 'dairy-bread' },
    { name: 'Snacks',     img: 'https://upload.wikimedia.org/wikipedia/commons/8/83/French_Fries.JPG',                                                                                           categorySlug: 'snacks' },
    { name: 'Spices',     img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Black_Cumin.jpg/240px-Black_Cumin.jpg',                                                                 categorySlug: 'spices-masala' },
    { name: 'Beverages',  img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Oranges_-_whole-halved-segment.jpg/240px-Oranges_-_whole-halved-segment.jpg',                          categorySlug: 'beverages' },
    { name: 'Atta & Dal', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/BESAN_CHAKKI_HOMEMADE_KOTA_003.jpg/240px-BESAN_CHAKKI_HOMEMADE_KOTA_003.jpg',                          categorySlug: 'groceries' },
  ];

  /** Saved addresses loaded from API */
  readonly savedAddresses = signal<any[]>([]);

  readonly shortDeliveryLabel = computed(() => {
    const full = this.deliveryLabel();
    return full.length > 28 ? full.slice(0, 26) + '…' : full;
  });

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

  private readonly categoryPhotoBySlug: Record<string, string> = {
    'fruits-vegetables': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Red_Apple.JPG',
    'dairy-bread': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Korb_mit_Br%C3%B6tchen.JPG/960px-Korb_mit_Br%C3%B6tchen.JPG',
    snacks: 'https://upload.wikimedia.org/wikipedia/commons/8/83/French_Fries.JPG',
    beverages: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Oranges_-_whole-halved-segment.jpg/960px-Oranges_-_whole-halved-segment.jpg',
    'groceries': 'https://upload.wikimedia.org/wikipedia/commons/0/07/Khyma_and_Basmati_rice.jpg',
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
    this.backButtonListener = App.addListener('backButton', () => App.exitApp());
    this.api.get<any[]>('/customer/profile/addresses')
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => this.savedAddresses.set(res || []) });

    if (!this.locationService.currentLocation()) {
      this.locationService.detectCurrentLocation().catch(() => {});
    }

    this.api.get<any[]>('/catalog/categories')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.categories.set(Array.isArray(res) ? res : (res as any)?.content || []),
        error: () => this.errorMsg.set('Could not load categories')
      });

    this.api.get<any[]>('/catalog/restaurants')
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => this.restaurants.set(Array.isArray(res) ? res : []) });

    this.api.get<any>('/catalog/products', { page: 0, size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const items = res?.content || [];
          this.allProducts.set(items);
          this.products.set(items);
        },
        error: () => this.errorMsg.set('Could not load products')
      });

  }

  ngOnDestroy(): void {
    this.backButtonListener?.then((h: any) => h.remove());
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  async startVoiceSearch(): Promise<void> {
    try {
      const { available } = await SpeechRecognition.available();
      if (!available) {
        alert('Voice search is not supported on this device.');
        return;
      }
      await SpeechRecognition.requestPermissions();
      this.isListening.set(true);
      const result = await SpeechRecognition.start({
        language: 'en-IN',
        maxResults: 1,
        prompt: 'Say what you want to search…',
        partialResults: false,
        popup: true,
      });
      const transcript = result?.matches?.[0] || '';
      if (transcript) this.searchTerm.set(transcript);
    } catch {
      // user cancelled or permission denied — silent
    } finally {
      this.isListening.set(false);
    }
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

  navToCategory(slug: string | null) {
    if (!slug) { this.selectCategory(null); return; }
    const cat = this.categories().find(c => c.slug === slug);
    if (cat) this.selectCategory(cat.id);
    else this.selectCategory(null);
  }

  clearChipFilter(): void {
    this.selectedCategorySlug.set(null);
    this.selectedCategoryId.set(null);
    this.selectedRestaurantId.set(null);
    this.selectedRestaurantName.set('');
    this.restaurantMenuItems.set([]);
    this.products.set(this.allProducts());
  }

  selectRestaurant(r: any): void {
    this.selectedRestaurantId.set(r.id);
    this.selectedRestaurantName.set(r.name);
    this.restaurantMenuItems.set([]);
    this.api.get<any>('/catalog/products', { restaurantId: r.id, page: 0, size: 50 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => this.restaurantMenuItems.set(res?.content || []) });
    setTimeout(() => {
      document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }

  backToRestaurants(): void {
    this.selectedRestaurantId.set(null);
    this.selectedRestaurantName.set('');
    this.restaurantMenuItems.set([]);
  }

  loadNearbyRestaurants(): void {
    const loc = this.locationService.currentLocation();
    const params: any = { radiusKm: 5 };
    if (loc) {
      params['lat'] = loc.latitude;
      params['lng'] = loc.longitude;
    }
    this.api.get<any[]>('/catalog/restaurants', params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => this.restaurants.set(Array.isArray(res) ? res : []) });
  }

  restaurantImage(r: any): string {
    if (r.imageUrl) return r.imageUrl;
    const cuisine = (r.cuisineType || '').toLowerCase();
    if (cuisine.includes('south')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Idli_Sambar.jpg/640px-Idli_Sambar.jpg';
    if (cuisine.includes('chinese')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Fried_rice_by_Shin_CJ.jpg/640px-Fried_rice_by_Shin_CJ.jpg';
    if (cuisine.includes('chaat') || cuisine.includes('snack')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Samosa_-_Bengali_style.jpg/640px-Samosa_-_Bengali_style.jpg';
    if (cuisine.includes('fast') || cuisine.includes('pizza')) return 'https://upload.wikimedia.org/wikipedia/commons/8/83/French_Fries.JPG';
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Dal_makhani.jpg/640px-Dal_makhani.jpg';
  }

  selectChip(slug: string): void {
    if (slug === 'food') {
      this.selectedCategorySlug.set('food');
      this.selectedCategoryId.set(-1);
      this.selectedRestaurantId.set(null);
      this.restaurantMenuItems.set([]);
      this.products.set([]);
      // Fetch nearby restaurants using current GPS location
      this.loadNearbyRestaurants();
      return;
    }
    // clear food state when switching to a non-food chip
    this.selectedRestaurantId.set(null);
    this.restaurantMenuItems.set([]);
    this.selectedCategorySlug.set(slug);
    // find category by exact slug, then partial match fallback
    let cat = this.categories().find(c => c.slug === slug);
    if (!cat) {
      cat = this.categories().find(c =>
        c.slug?.toLowerCase().includes(slug.split('-')[0]) ||
        c.name?.toLowerCase().includes(slug.split('-')[0])
      );
    }
    if (cat) {
      this.selectedCategoryId.set(cat.id);
      // filter from already-loaded allProducts — no extra API call needed
      this.products.set(this.allProducts().filter(p => p.categoryId === cat!.id));
    } else {
      // slug not in categories yet — show nothing so user sees the filter is active
      this.selectedCategoryId.set(-1);
      this.products.set([]);
    }
    setTimeout(() => {
      document.getElementById('prod-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  selectCategory(id: number | null): void {
    this.selectedCategoryId.set(id);
    if (id === null) {
      this.selectedCategorySlug.set(null);
      this.products.set(this.allProducts());
    }
  }

  readonly categoryProducts = computed(() => {
    const id = this.selectedCategoryId();
    if (id === null) return this.products();
    return this.products().filter(p => p.categoryId === id);
  });

  readonly activeCategorySlug = computed(() => this.selectedCategorySlug() ?? '');

  activeCategoryName(): string {
    const id = this.selectedCategoryId();
    return this.categories().find(c => c.id === id)?.name || 'Products';
  }

  maxDiscount(): number {
    if (!this.products().length) return 0;
    return Math.max(...this.products().map(p => this.getDiscount(p)));
  }

  catEmoji(slug: string): string {
    const map: Record<string, string> = {
      'fruits-vegetables': '🥦', 'dairy-bread': '🥛', 'snacks': '🍿',
      'beverages': '☕', 'groceries': '🛒', 'spices-masala': '🌶️',
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

  productImage(product: any): string {
    return product?.imageUrl || '';
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


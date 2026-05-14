import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { Router, RouterLink } from '@angular/router';
import { CartState } from '../../core/state/cart.state';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';
import { ActivityState } from '../../core/state/activity.state';
import { LocationService } from '../../core/services/location.service';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, BottomNavComponent],
  template: `
    <!-- ═══════════════════════════════════════
         STICKY HEADER
    ═══════════════════════════════════════ -->
    <ion-header>
      <ion-toolbar class="hdr-toolbar">
        <!-- LEFT: Logo + Delivery -->
        <div class="hdr-left">
          <div class="hdr-logo-wrap">
            <span class="logo-leaf">🌿</span>
            <span class="logo-text"><span class="logo-o">Order</span><span class="logo-k">Kro</span></span>
          </div>
          <div class="hdr-deliver" (click)="goToProfile()">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#667eea"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span class="hdr-deliver-text">{{ shortDeliveryLabel() }}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#999"><path d="M7 10l5 5 5-5z"/></svg>
          </div>
        </div>
        <!-- RIGHT: Bell + Cart + Menu -->
        <div class="hdr-right">
          <button class="hdr-btn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span class="hdr-badge red">2</span>
          </button>
          <button class="hdr-btn" routerLink="/cart" aria-label="Cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#333"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.9 18 9 18h12v-2H9.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 23.25 8H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            <span class="hdr-badge red" *ngIf="totalCartItems() > 0">{{ totalCartItems() }}</span>
          </button>
          <button class="hdr-btn" (click)="showMenu.set(!showMenu())" aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2.2" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="17" y2="12"/>
              <line x1="3" y1="18" x2="13" y2="18"/>
            </svg>
          </button>
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
          <button class="mic-btn" aria-label="Voice">
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

        <!-- ── HERO BANNER ── -->
        <div class="hero-banner">
          <div class="hero-bg">
            <!-- Floating grocery emoji items -->
            <span class="hero-item hi1">🧅</span>
            <span class="hero-item hi2">🍅</span>
            <span class="hero-item hi3">🥛</span>
            <span class="hero-item hi4">🍌</span>
            <span class="hero-item hi5">🫙</span>
            <span class="hero-item hi6">🌾</span>
            <span class="hero-item hi7">🥬</span>
            <span class="hero-item hi8">🍊</span>
          </div>
          <div class="hero-content">
            <div class="hero-badge-row">
              <span class="hero-badge">⚡ 15-30 Min Delivery</span>
              <span class="hero-badge">✅ Fresh Quality</span>
              <span class="hero-badge">📦 Safe Packing</span>
            </div>
            <h1 class="hero-title">Fresh Groceries,<br>Snacks &amp; Essentials</h1>
            <p class="hero-sub">Daily delivery in your neighbourhood</p>
            <div class="hero-cta-row">
              <button class="hero-cta" (click)="navToCategory('fruits-vegetables')">🥦 Vegetables</button>
              <button class="hero-cta" (click)="navToCategory('fruits-vegetables')">🍎 Fruits</button>
              <button class="hero-cta" (click)="navToCategory('snacks')">🍿 Snacks</button>
              <button class="hero-cta" (click)="navToCategory('beverages')">☕ Tea</button>
            </div>
          </div>
        </div>

        <!-- ── FEATURE STRIP ── -->
        <div class="feature-strip">
          <div class="feat-card" *ngFor="let f of featureItems">
            <span class="feat-icon">{{ f.icon }}</span>
            <span class="feat-text">{{ f.label }}</span>
          </div>
        </div>

        <!-- ── TIME-BASED FOOD CAROUSEL ── -->
        <div class="section-pad">
          <div class="section-row">
            <div>
              <h3 class="section-title">{{ timeGreeting() }} {{ timeEmoji() }}</h3>
              <p class="section-sub">{{ timeSubtitle() }}</p>
            </div>
            <button class="see-all-btn" routerLink="/products">See all</button>
          </div>
          <!-- Auto-scroll carousel track -->
          <div class="food-carousel-outer">
            <div class="food-carousel-track" [style.transform]="'translateX(-' + (foodSlide() * 140) + 'px)'">
              <div class="food-card" *ngFor="let f of currentFoodItems()" (click)="quickSearch(f.name)">
                <div class="food-card-img">{{ f.emoji }}</div>
                <div class="food-card-name">{{ f.name }}</div>
                <div class="food-card-tag">{{ f.tag }}</div>
              </div>
            </div>
          </div>
          <!-- Dots indicator -->
          <div class="carousel-dots">
            <span class="cdot" *ngFor="let d of foodDots(); let i = index"
              [class.active]="foodSlide() === i" (click)="foodSlide.set(i)"></span>
          </div>
        </div>

        <!-- ── CATEGORY CARDS ── -->
        <div class="section-pad">
          <div class="section-row">
            <h3 class="section-title">🛍️ Shop by Category</h3>
          </div>
          <div class="cat-cards-row">
            <div class="cat-card" *ngFor="let c of categoryCards"
              (click)="c.categorySlug ? navToCategory(c.categorySlug) : selectCategory(null)">
              <div class="cat-card-img">{{ c.emoji }}</div>
              <div class="cat-card-name">{{ c.name }}</div>
            </div>
          </div>
        </div>

        <!-- ── HOT DEALS ── -->
        <ng-container *ngIf="getHotDeals().length > 0">
          <div class="section-pad">
            <div class="section-row">
              <h3 class="section-title">🔥 Hot Deals</h3>
              <button class="see-all-btn" (click)="selectCategory(null)">View all</button>
            </div>
            <div class="deals-row">
              <div class="deal-chip" *ngFor="let p of getHotDeals()"
                [routerLink]="['/products']" [queryParams]="{ query: p.name }">
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
                  <ng-container *ngIf="cartQty(p.id) === 0; else dealStep">
                    <button class="add-btn-flat" (click)="addToCart(p)">+ Add</button>
                  </ng-container>
                  <ng-template #dealStep>
                    <div class="stepper stepper-xs"><button class="step-btn" (click)="removeFromCart(p)">−</button><span class="step-qty">{{ cartQty(p.id) }}</span><button class="step-btn" (click)="addToCart(p)">+</button></div>
                  </ng-template>
                </div>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- ── CATEGORY STRIP (pills) + ALL / FILTERED PRODUCTS ── -->
        <div class="cat-strip-wrap">
          <div class="cat-strip">
            <button class="cat-pill" [class.active]="selectedCategoryId() === null" (click)="selectCategory(null)">
              <div class="cat-emoji">🛒</div>
              <div class="cat-name">All</div>
            </button>
            <button class="cat-pill" *ngFor="let c of categories()"
              [class.active]="selectedCategoryId() === c.id" (click)="selectCategory(c.id)">
              <div class="cat-emoji">{{ catEmoji(c.slug) }}</div>
              <div class="cat-name">{{ c.name }}</div>
            </button>
          </div>
        </div>

        <div class="browse-pad">
          <div class="section-row">
            <h3 class="section-title" *ngIf="selectedCategoryId() === null">✨ All Products</h3>
            <h3 class="section-title" *ngIf="selectedCategoryId() !== null">{{ catEmoji(activeCategorySlug()) }} {{ activeCategoryName() }}</h3>
            <span class="item-count">{{ (selectedCategoryId() === null ? products() : categoryProducts()).length }} items</span>
          </div>

          <div class="prod-grid" *ngIf="(selectedCategoryId() === null ? products() : categoryProducts()).length > 0; else noItems">
            <div class="prod-card"
              *ngFor="let p of (selectedCategoryId() === null ? products().slice(0,40) : categoryProducts()); let i = index"
              [style.animationDelay.ms]="i*20"
              [routerLink]="['/products']" [queryParams]="{ query: p.name }">
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
      --padding-start: 14px;
      --padding-end: 14px;
      --min-height: 56px;
      display: flex;
      align-items: center;
    }
    /* Override ion-toolbar default slot layout */
    .hdr-toolbar::part(native) {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
    }
    .hdr-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }
    .hdr-logo-wrap {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .logo-leaf { font-size: 1rem; line-height: 1; }
    .logo-text { font-size: 1.45rem; font-weight: 900; letter-spacing: -0.5px; line-height: 1; }
    .logo-o { color: #1a1a1a; }
    .logo-k { color: #667eea; }
    .hdr-deliver {
      display: flex;
      align-items: center;
      gap: 3px;
      cursor: pointer;
      padding: 2px 0;
    }
    .hdr-deliver-text {
      font-size: 0.73rem;
      font-weight: 600;
      color: #555;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }
    .hdr-right {
      display: flex;
      align-items: center;
      gap: 4px;
    }
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
    /* ══════════════════════════════════════
       HERO BANNER
    ══════════════════════════════════════ */
    .hero-banner {
      margin: 12px 14px;
      border-radius: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      overflow: hidden;
      position: relative;
      min-height: 200px;
    }
    .hero-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .hero-item {
      position: absolute;
      font-size: 2rem;
      opacity: 0.18;
      animation: floatItem 6s ease-in-out infinite;
    }
    .hi1 { top: 8%; left: 5%;  animation-delay: 0s;   font-size: 1.8rem; }
    .hi2 { top: 5%; left: 30%; animation-delay: 0.8s; }
    .hi3 { top: 10%; right: 8%; animation-delay: 1.4s; font-size: 2.2rem; }
    .hi4 { bottom: 15%; left: 8%; animation-delay: 2s; }
    .hi5 { top: 40%; right: 5%; animation-delay: 0.4s; font-size: 1.6rem; }
    .hi6 { bottom: 8%; right: 20%; animation-delay: 1.8s; font-size: 1.5rem; }
    .hi7 { bottom: 5%; left: 35%; animation-delay: 1s;  font-size: 2rem; }
    .hi8 { top: 25%; left: 55%; animation-delay: 2.4s; font-size: 1.7rem; }
    @keyframes floatItem {
      0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.18; }
      50%       { transform: translateY(-10px) rotate(8deg); opacity: 0.28; }
    }
    .hero-content {
      position: relative;
      z-index: 2;
      padding: 20px 18px 18px;
    }
    .hero-badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }
    .hero-badge {
      background: rgba(255,255,255,0.2);
      color: #fff;
      font-size: 0.67rem;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.3);
      letter-spacing: 0.2px;
    }
    .hero-title {
      font-size: 1.45rem;
      font-weight: 900;
      color: #fff;
      line-height: 1.25;
      margin: 0 0 6px;
      letter-spacing: -0.3px;
    }
    .hero-sub {
      font-size: 0.82rem;
      color: rgba(255,255,255,0.82);
      margin: 0 0 14px;
      font-weight: 500;
    }
    .hero-cta-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .hero-cta {
      background: rgba(255,255,255,0.18);
      border: 1.5px solid rgba(255,255,255,0.4);
      color: #fff;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 20px;
      cursor: pointer;
      transition: background 0.18s;
      backdrop-filter: blur(4px);
    }
    .hero-cta:active { background: rgba(255,255,255,0.32); }
    /* ══════════════════════════════════════
       FEATURE STRIP (glassmorphism)
    ══════════════════════════════════════ */
    .feature-strip {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding: 0 14px 4px;
      scrollbar-width: none;
    }
    .feature-strip::-webkit-scrollbar { display: none; }
    .feat-card {
      flex-shrink: 0;
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(8px);
      border: 1px solid #e8ecf4;
      border-radius: 14px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-width: 72px;
      box-shadow: 0 2px 8px rgba(102,126,234,0.08);
    }
    .feat-icon { font-size: 1.4rem; line-height: 1; }
    .feat-text { font-size: 0.62rem; font-weight: 700; color: #444; text-align: center; line-height: 1.2; }
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
      width: 130px;
      background: #fff;
      border-radius: 16px;
      border: 1px solid #e8ecf4;
      padding: 14px 10px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);
      transition: transform 0.18s, box-shadow 0.18s;
    }
    .food-card:active { transform: scale(0.96); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .food-card-img { font-size: 2.6rem; line-height: 1; }
    .food-card-name { font-size: 0.82rem; font-weight: 700; color: #1a1a1a; text-align: center; line-height: 1.2; }
    .food-card-tag { font-size: 0.65rem; font-weight: 600; color: #667eea; background: #eef1ff; border-radius: 20px; padding: 2px 8px; }
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
      padding: 12px 6px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .cat-card:active { transform: scale(0.95); }
    .cat-card-img { font-size: 1.8rem; line-height: 1; }
    .cat-card-name { font-size: 0.62rem; font-weight: 700; color: #444; text-align: center; line-height: 1.2; }
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
  `]

        <!-- ── ROW 1: Hamburger | Brand | Bell ── -->
        <div class="hdr-row1">
          <button class="hdr-icon-btn" (click)="showMenu.set(!showMenu())" aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2.2" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="17" y2="12"/>
              <line x1="3" y1="18" x2="13" y2="18"/>
            </svg>
          </button>

          <div class="hdr-brand">
            <div class="hdr-brand-row">
              <span class="hdr-leaf">&#127807;</span>
              <span class="hdr-logo"><span class="logo-order">Order</span><span class="logo-kro">Kro</span></span>
            </div>
            <div class="hdr-tagline">Fresh &bull; Local &bull; Fast</div>
          </div>

          <button class="hdr-icon-btn hdr-bell" aria-label="Notifications">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span class="bell-badge">2</span>
          </button>
        </div>

        <!-- ── ROW 2: Delivery location pill ── -->
        <div class="hdr-row2">
          <div class="deliver-pill" (click)="goToProfile()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#16a34a" style="flex-shrink:0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <div class="pill-body">
              <span class="pill-label">Deliver to</span>
              <span class="pill-addr">{{ shortDeliveryLabel() }}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#888" style="flex-shrink:0"><path d="M7 10l5 5 5-5z"/></svg>
          </div>
        </div>

        <!-- ── ROW 3: Search bar ── -->
        <div class="hdr-row3">
          <div class="search-pill">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2.2" stroke-linecap="round" style="flex-shrink:0">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              class="search-input"
              type="text"
              placeholder="Search groceries, vegetables, fruits, snacks…"
              [value]="searchTerm()"
              (input)="searchTerm.set($any($event).target.value || '')"
              (keyup.enter)="submitSearch(searchTerm())"
            />
            <button class="mic-btn" aria-label="Voice search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

      </div>
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
    /* ────────── APP HEADER ────────── */
    ion-header {
      --background: transparent;
      box-shadow: none;
    }
    .app-header {
      background: #fff;
      padding: 12px 16px 10px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.08);
      position: relative;
    }
    /* ROW 1 */
    .hdr-row1 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .hdr-icon-btn {
      background: #f5f6fa;
      border: none;
      border-radius: 12px;
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .hdr-icon-btn:active { background: #eaeef8; }
    .hdr-brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      padding: 0 8px;
    }
    .hdr-brand-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .hdr-leaf {
      font-size: 1rem;
      line-height: 1;
      margin-bottom: 2px;
    }
    .hdr-logo {
      font-size: 1.65rem;
      font-weight: 900;
      letter-spacing: -0.5px;
      line-height: 1;
    }
    .logo-order {
      color: #1a1a1a;
    }
    .logo-kro {
      color: #16a34a;
    }
    .hdr-tagline {
      font-size: 0.65rem;
      font-weight: 700;
      color: #888;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      margin-top: 2px;
    }
    /* Bell */
    .hdr-bell {
      position: relative;
    }
    .bell-badge {
      position: absolute;
      top: 6px;
      right: 6px;
      background: #ef4444;
      color: #fff;
      font-size: 0.52rem;
      font-weight: 800;
      min-width: 14px;
      height: 14px;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
      line-height: 1;
      pointer-events: none;
      border: 1.5px solid #fff;
    }
    /* ROW 2: Delivery pill */
    .hdr-row2 {
      margin-bottom: 10px;
    }
    .deliver-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f0faf5;
      border: 1.5px solid #bbf7d0;
      border-radius: 50px;
      padding: 7px 12px;
      cursor: pointer;
      max-width: 100%;
      box-shadow: 0 2px 8px rgba(22,163,74,0.08);
      transition: box-shadow 0.18s;
    }
    .deliver-pill:active { box-shadow: 0 1px 3px rgba(22,163,74,0.1); }
    .pill-body {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }
    .pill-label {
      font-size: 0.6rem;
      font-weight: 700;
      color: #16a34a;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      line-height: 1.2;
    }
    .pill-addr {
      font-size: 0.82rem;
      font-weight: 700;
      color: #1a1a1a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: calc(100vw - 100px);
      line-height: 1.3;
    }
    /* ROW 3: Search */
    .hdr-row3 {}
    .search-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f5f6fa;
      border: 1.5px solid #e8ecf4;
      border-radius: 16px;
      padding: 10px 14px;
      transition: border-color 0.18s, box-shadow 0.18s;
    }
    .search-pill:focus-within {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102,126,234,0.12);
      background: #fff;
    }
    .search-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 0.88rem;
      color: #1a1a1a;
      font-weight: 500;
      min-width: 0;
    }
    .search-input::placeholder { color: #aaa; font-weight: 400; }
    .mic-btn {
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    /* content background */
    .home-content {
      --background: #f5f6fa;
    }
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
  readonly errorMsg = signal('');
  readonly quickSearches = ['Milk', 'Banana', 'Rice', 'Bread', 'Chips', 'Juice'];
  readonly selectedCategoryId = signal<number | null>(null);
  readonly showMenu = signal(false);
  // food carousel
  readonly foodSlide = signal(0);
  private destroy$ = new Subject<void>();

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
    { name: 'Grocery',    emoji: '🛒', categorySlug: 'staples-pulses' },
    { name: 'Vegetables', emoji: '🥦', categorySlug: 'fruits-vegetables' },
    { name: 'Fruits',     emoji: '🍎', categorySlug: 'fruits-vegetables' },
    { name: 'Dairy',      emoji: '🥛', categorySlug: 'dairy-bread' },
    { name: 'Snacks',     emoji: '🍿', categorySlug: 'snacks' },
    { name: 'Chaat',      emoji: '🥗', categorySlug: null },
    { name: 'Tea',        emoji: '☕', categorySlug: 'beverages' },
    { name: 'Fast Food',  emoji: '🍱', categorySlug: null },
  ];

  // ── Time-based food carousel items ──
  // dynamic time based rotating food carousel
  private readonly morningFoods = [
    { emoji: '☕', name: 'Masala Chai',     tag: 'Morning ☀️' },
    { emoji: '🥟', name: 'Samosa',          tag: 'Hot & Fresh' },
    { emoji: '🥞', name: 'Poha',            tag: 'Breakfast' },
    { emoji: '🫓', name: 'Bread Pakoda',    tag: 'Street Style' },
    { emoji: '🧆', name: 'Idlee',           tag: 'South Special' },
    { emoji: '🥣', name: 'Dhokla',          tag: 'Gujarati' },
  ];

  private readonly afternoonFoods = [
    // afternoon meals
    { emoji: '🍛', name: 'Paneer Fried Rice', tag: 'Lunch Special' },
    { emoji: '🌶️', name: 'Chilli Paneer',     tag: 'Indo-Chinese' },
    { emoji: '🍗', name: 'Chicken Curry',      tag: 'Non-Veg' },
    { emoji: '🍱', name: 'Thali',              tag: 'Full Meal' },
    { emoji: '🥘', name: 'Dal Tadka',          tag: 'Comfort Food' },
    { emoji: '🫔', name: 'Wrap',               tag: 'Quick Bite' },
  ];

  private readonly eveningFoods = [
    // evening snacks
    { emoji: '🥗', name: 'Tikkiya Chaat',  tag: 'Evening 🌆' },
    { emoji: '🥟', name: 'Samosa Chaat',   tag: 'Street Food' },
    { emoji: '☕', name: 'Cutting Chai',   tag: 'Tea Time' },
    { emoji: '🧆', name: 'Aloo Tikki',     tag: 'Popular' },
    { emoji: '🫕', name: 'Chana Masala',   tag: 'Desi Taste' },
    { emoji: '🍩', name: 'Kachori',        tag: 'Crispy' },
  ];

  private readonly nightFoods = [
    // dinner quick bites
    { emoji: '🥛', name: 'Cold Milk',        tag: 'Night 🌙' },
    { emoji: '🍪', name: 'Biscuits',          tag: 'Light Snack' },
    { emoji: '🍜', name: 'Maggi',             tag: '2-Min Noodles' },
    { emoji: '🧀', name: 'Bread & Butter',   tag: 'Simple' },
    { emoji: '🫐', name: 'Dry Fruits',        tag: 'Healthy' },
    { emoji: '🍦', name: 'Ice Cream',         tag: 'Dessert' },
  ];

  readonly currentFoodItems = computed(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11)  return this.morningFoods;
    if (h >= 11 && h < 16) return this.afternoonFoods;
    if (h >= 16 && h < 21) return this.eveningFoods;
    return this.nightFoods;
  });

  readonly foodDots = computed(() =>
    Array.from({ length: Math.max(0, this.currentFoodItems().length - 2) })
  );

  readonly timeGreeting = computed(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11)  return 'Good Morning!';
    if (h >= 11 && h < 16) return 'Lunch Time!';
    if (h >= 16 && h < 21) return 'Evening Cravings?';
    return 'Night Munchies?';
  });

  readonly timeEmoji = computed(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11)  return '☀️';
    if (h >= 11 && h < 16) return '🍱';
    if (h >= 16 && h < 21) return '🌆';
    return '🌙';
  });

  readonly timeSubtitle = computed(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11)  return 'Chai aur Garma-Garam Samosa';
    if (h >= 11 && h < 16) return 'Fried Rice, Paneer & more';
    if (h >= 16 && h < 21) return 'Chaat, Tikkiya & Evening Bites';
    return 'Light bites delivered fast';
  });

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

    // Auto-advance food carousel every 2.5s
    interval(2500)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const max = Math.max(0, this.currentFoodItems().length - 2);
        this.foodSlide.update(s => s >= max ? 0 : s + 1);
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

  navToCategory(slug: string | null) {
    if (!slug) { this.selectCategory(null); return; }
    const cat = this.categories().find(c => c.slug === slug);
    if (cat) this.selectCategory(cat.id);
    else this.selectCategory(null);
  }

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


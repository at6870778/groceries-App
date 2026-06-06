import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonList, IonItem, IonLabel, IonButton, IonBadge, IonToast, IonButtons, IonSearchbar, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { CartState } from '../../core/state/cart.state';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';
import { ActivityState } from '../../core/state/activity.state';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, IonButton, IonBadge, IonToast, IonButtons, IonSearchbar, IonRefresher, IonRefresherContent, BottomNavComponent],
  template: `
    <ion-header>
      <ion-toolbar class="search-toolbar">
        <ion-searchbar
          class="header-searchbar"
          [placeholder]="categoryName() || 'Search products'"
          [value]="searchTerm()"
          showClearButton="focus"
          (ionInput)="onSearchInput($any($event).detail.value || '')">
        </ion-searchbar>
        <ion-buttons slot="end">
          <ion-button routerLink="/cart" class="cart-btn">
            🛒<ion-badge color="danger" *ngIf="cartCount() > 0">{{ cartCount() }}</ion-badge>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content [scrollEvents]="true" [fullscreen]="false" class="products-content ion-padding" style="--padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px))">
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <ion-toast
        [isOpen]="toastOpen()"
        [message]="toastMsg()"
        [color]="toastColor()"
        duration="1800"
        (didDismiss)="toastOpen.set(false)">
      </ion-toast>
      <div *ngIf="loading()" class="status">Loading products...</div>
      <div *ngIf="!loading() && products().length === 0" class="status">No products found for this category/search.</div>

      <div class="grid" *ngIf="!loading() && products().length > 0">
        <article class="item" *ngFor="let p of products(); let i = index" [style.animationDelay.ms]="i * 45" (click)="openQuickView(p, $event)">
          <div class="item-art" [class.has-photo]="p.imageUrl" [style.background]="p.imageUrl ? '#fff' : productBg(p)">
            <div class="discount-badge" *ngIf="+p.mrp > +p.sellingPrice">{{ getDiscount(p) }}%</div>
            <img *ngIf="p.imageUrl" class="art-image photo-img" [src]="p.imageUrl" [alt]="p.name">
          </div>
          <div class="meta">
            <div class="brand">{{ getBrandName(p.name) }}</div>
            <div class="name">{{ p.name }}</div>
            <div class="unit">{{ scaledUnit(p.unit, cartQty(p.id)) }}</div>
            <div class="pricing">
              <span class="original-price" *ngIf="+p.mrp > +p.sellingPrice">₹{{ +p.mrp * (cartQty(p.id) || 1) }}</span>
              <span class="sale-price">₹{{ +p.sellingPrice * (cartQty(p.id) || 1) }}</span>
            </div>
            <div class="delivery-time">📦 10 mins</div>
            <div class="action-row">
              <div class="stepper-wrap" (click)="$event.stopPropagation()">
                <ng-container *ngIf="cartQty(p.id) === 0; else stepper">
                  <button (click)="addToCart(p)" class="add-btn" [class.adding]="adding() === p.id">
                    {{ adding() === p.id ? '...' : 'ADD' }}
                  </button>
                </ng-container>
                <ng-template #stepper>
                  <div class="stepper">
                    <button class="step-btn" (click)="removeFromCart(p)">−</button>
                    <span class="step-qty">{{ cartQty(p.id) }}</span>
                    <button class="step-btn" (click)="addToCart(p)">+</button>
                  </div>
                </ng-template>
              </div>
              <button (click)="buyNow(p)" class="buy-btn" [class.adding]="adding() === p.id">
                {{ adding() === p.id ? '...' : 'BUY' }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </ion-content>

    <!-- ══════════════════════════════════════
         QUICK-VIEW MODAL
    ══════════════════════════════════════ -->
    <div class="modal-overlay" *ngIf="showQuickViewModal()" (click)="closeQuickView()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <button class="modal-close" (click)="closeQuickView()">✕</button>
        <div *ngIf="selectedProductForModal() as product" class="quick-view-product">
          <div class="qv-image-wrap" 
               (touchstart)="onTouchStart($event)" 
               (touchmove)="onTouchMove($event)" 
               (touchend)="onTouchEnd($event)"
               (wheel)="onMouseWheel($event)"
               (click)="toggleZoomControls()">
            <div class="qv-image-container" [style.transform]="'scale(' + imageZoom() + ')'" [style.transformOrigin]="'center'">
              <img 
                *ngIf="product.imageUrl" 
                class="qv-image" 
                [src]="product.imageUrl" 
                [alt]="product.name"
                [style.cursor]="imageZoom() > 1 ? 'grab' : 'zoom-in'">
            </div>
          </div>
          
          <!-- Product Details -->
          <div class="qv-details">
            <div class="qv-category">{{ product.categoryName }}</div>
            <h2 class="qv-name">{{ product.name }}</h2>
            <div class="qv-unit" *ngIf="product.unit">{{ scaledUnit(product.unit, cartQty(product.id)) }}</div>
            <div class="qv-price-row">
              <span class="qv-price">₹{{ product.sellingPrice * (cartQty(product.id) || 1) }}</span>
              <span class="qv-mrp" *ngIf="product.mrp && product.mrp > product.sellingPrice">₹{{ product.mrp * (cartQty(product.id) || 1) }}</span>
              <span class="qv-discount" *ngIf="getDiscount(product) > 0">{{ getDiscount(product) }}% OFF</span>
            </div>
            <div class="qv-description" *ngIf="product.description">{{ product.description }}</div>
          </div>
          
          <div class="qv-actions">
            <button class="qv-cancel-btn" (click)="closeQuickView()">Continue Shopping</button>
            <ng-container *ngIf="cartQty(product.id) === 0; else qvStep">
              <button class="qv-add-btn" (click)="addToCartFromModal(product)">+ Add to Cart</button>
            </ng-container>
            <ng-template #qvStep>
              <div class="qv-stepper">
                <button class="qv-step-btn" (click)="removeFromCart(product)">−</button>
                <span class="qv-qty">{{ cartQty(product.id) }}</span>
                <button class="qv-step-btn" (click)="addToCart(product)">+</button>
              </div>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
    <app-bottom-nav></app-bottom-nav>
  `,
  styles: [`
    .search-toolbar {
      --background: #ffffff;
      --border-width: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .header-searchbar {
      --background: #f2f3f7;
      --border-radius: 12px;
      --box-shadow: none;
      --placeholder-color: #9aa0b2;
      --color: #1a1a1a;
      --icon-color: #9aa0b2;
      --clear-button-color: #9aa0b2;
      padding: 6px 0;
      font-size: 0.95rem;
    }
    .cart-btn {
      font-size: 1.2rem;
      position: relative;
    }
    .products-content {
      --background: linear-gradient(180deg, #fffdf9 0%, #f7fbff 100%);
      --scroll-padding-top: 0;
      --scroll-padding-bottom: 0;
      display: flex;
      flex-direction: column;
    }
    .status {
      text-align: center;
      color: #6f7f95;
      margin: 22px 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      padding-bottom: 30px;
    }
    .item {
      position: relative;
      border: 1px solid #e7edf6;
      border-radius: 14px;
      overflow: visible;
      background: #fff;
      box-shadow: 0 8px 24px rgba(26, 62, 109, 0.08);
      animation: rise .45s ease both;
    }
    .item img {
      width: 100%;
      height: 110px;
      object-fit: cover;
      display: block;
    }
    .item-art {
      width: 100%;
      height: 98px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 6px 8px;
      position: relative;
      overflow: hidden;
    }
    .item-art::before {
      content: '';
      position: absolute;
      inset: 14px 22px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.28);
      filter: blur(2px);
    }
    .item-art.has-photo::before {
      display: none;
    }
    .art-image {
      position: relative;
      z-index: 1;
      width: 82px;
      height: 82px;
      object-fit: contain;
      filter: drop-shadow(0 6px 8px rgba(0,0,0,.12));
      transform: translateY(-1px);
    }
    .art-image.photo-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: none;
      transform: none;
      border-radius: 0;
      z-index: 2;
    }
    .art-label {
      position: relative;
      z-index: 1;
      font-size: 0.78rem;
      font-weight: 700;
      color: rgba(20, 20, 20, 0.82);
      text-align: center;
      line-height: 1.1;
      background: rgba(255, 255, 255, 0.72);
      padding: 3px 8px;
      border-radius: 999px;
      max-width: 92%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta { 
      padding: 11px 10px 10px; 
      background: white;
    }
    .brand {
      font-size: 0.7rem;
      color: #999;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 3px;
    }
    .name { 
      font-weight: 700; 
      line-height: 1.2;
      font-size: 0.95rem;
      color: #1a1a1a;
      margin-bottom: 2px;
    }
    .unit { 
      font-size: 0.8rem; 
      color: #888; 
      margin-bottom: 6px;
    }
    .pricing {
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
      font-size: 1rem;
      color: #667eea;
    }
    .delivery-time {
      font-size: 0.75rem;
      color: #667eea;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .action-row {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 6px;
      width: 100%;
    }
    .stepper-wrap {
      width: 100%;
    }
    .stepper {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      background: #f0f0f0;
      border-radius: 20px;
      overflow: hidden;
      height: 32px;
      width: 100%;
    }
    .add-btn {
      height: 32px;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 700;
      white-space: nowrap;
      width: 100%;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: #ffffff !important;
      box-shadow: 0 6px 14px rgba(108, 71, 255, 0.26) !important;
      border: none !important;
      cursor: pointer;
      padding: 0;
    }
    .add-btn:active, .add-btn:focus {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      box-shadow: 0 6px 14px rgba(108, 71, 255, 0.26) !important;
      outline: none !important;
      color: #ffffff !important;
    }
    .add-btn:hover {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: #ffffff !important;
    }
    .add-btn.adding {
      opacity: 0.7;
      pointer-events: none;
    }
    .step-btn {
      background: none;
      border: none;
      font-size: 1.1rem;
      font-weight: 700;
      color: #667eea;
      flex: 1 1 0;
      height: 32px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .step-qty {
      flex: 0 0 auto;
      min-width: 24px;
      text-align: center;
      font-weight: 700;
      font-size: 0.95rem;
      color: #1a1a1a;
    }
    .buy-btn {
      width: 100%;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: #ffffff !important;
      border-radius: 10px;
      box-shadow: 0 6px 14px rgba(108, 71, 255, 0.26) !important;
      font-weight: 700;
      border: none !important;
      cursor: pointer;
      padding: 8px 16px;
      font-size: 0.95rem;
    }
    .buy-btn:active, .buy-btn:focus {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      box-shadow: 0 6px 14px rgba(108, 71, 255, 0.26) !important;
      outline: none !important;
      color: #ffffff !important;
    }
    .buy-btn:hover {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: #ffffff !important;
    }
    .buy-btn.adding {
      opacity: 0.7;
      pointer-events: none;
    }
    .discount-badge {
      position: absolute;
      top: 6px;
      right: 6px;
      background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
      color: white;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.78rem;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(255, 107, 107, 0.45);
    }
    .price { color: #154172; font-weight: 700; }
    @keyframes rise {
      from { opacity: 0; transform: translateY(10px) scale(0.985); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ══════════════════════════════════════
       QUICK-VIEW MODAL
    ══════════════════════════════════════ */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fade-in 0.3s ease;
      overflow: hidden;
      padding: 16px;
    }
    @keyframes fade-in {
      from { opacity: 0; backdrop-filter: blur(0px); }
      to { opacity: 1; backdrop-filter: blur(6px); }
    }
    .modal-content {
      width: 100%;
      max-width: 450px;
      max-height: 90vh;
      background: #fff;
      border-radius: 20px;
      animation: zoom-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      overflow-y: auto;
      overflow-x: hidden;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .modal-content::-webkit-scrollbar { width: 6px; }
    .modal-content::-webkit-scrollbar-track { background: transparent; }
    .modal-content::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
    @keyframes zoom-in {
      from { 
        transform: scale(0.8) translateY(20px);
        opacity: 0;
      }
      to { 
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }
    .modal-close {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.7);
      border: none;
      font-size: 1.4rem;
      color: #fff;
      cursor: pointer;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .modal-close:active { 
      background: rgba(0, 0, 0, 0.85);
      transform: scale(1.15);
    }
    
    .quick-view-product {
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      width: 100%;
      min-height: 0;
      max-height: 100%;
      overflow: hidden;
    }
    .qv-image-wrap {
      width: 100%;
      max-height: 50vh;
      min-height: 180px;
      border-radius: 16px 16px 0 0;
      overflow: hidden;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f8f9f0 0%, #fafbf7 100%);
      flex-shrink: 1;
      position: relative;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      overflow: hidden;
      touch-action: manipulation;
    }
    .qv-image-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease-out;
      transform-origin: center;
    }
    .qv-image { 
      width: 100%; 
      height: 100%; 
      object-fit: contain; 
      padding: 24px;
      background: linear-gradient(135deg, #f8f9f0 0%, #fafbf7 100%);
      cursor: zoom-in;
      transition: cursor 0.2s ease;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
    }
    .zoom-controls {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 30;
      display: flex;
      gap: 8px;
      background: rgba(0, 0, 0, 0.6);
      padding: 8px 12px;
      border-radius: 20px;
      backdrop-filter: blur(10px);
      animation: slide-down 0.3s ease;
    }
    @keyframes slide-down {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .zoom-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      border-radius: 50%;
      font-size: 1.2rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .zoom-btn:active {
      background: rgba(255, 255, 255, 0.4);
      transform: scale(0.95);
    }
    .zoom-out span {
      display: inline-block;
      transition: transform 0.3s ease;
    }
    .zoom-btn:active span {
      transform: rotate(360deg);
    }
    .zoom-hint {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      white-space: nowrap;
      z-index: 25;
      pointer-events: none;
      animation: fade-in-out 3s ease;
    }
    @keyframes fade-in-out {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
      15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    }
    
    /* Product Details Section */
    .qv-details {
      padding: 14px 16px;
      background: #fff;
      border-bottom: 1px solid #f0f0f0;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }
    
    .qv-category {
      font-size: 0.68rem;
      font-weight: 700;
      color: #667eea;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .qv-name {
      margin: 0 0 6px;
      font-size: 1.2rem;
      font-weight: 800;
      color: #1a1a1a;
      line-height: 1.3;
    }
    
    .qv-unit {
      font-size: 0.72rem;
      color: #999;
      margin-bottom: 6px;
      font-weight: 500;
    }
    
    .qv-price-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    
    .qv-price {
      font-weight: 800;
      font-size: 1.35rem;
      color: #1a1a1a;
    }
    
    .qv-mrp {
      text-decoration: line-through;
      color: #bbb;
      font-size: 0.88rem;
    }
    
    .qv-discount {
      background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
      color: #fff;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      margin-left: auto;
    }
    
    .qv-description {
      font-size: 0.82rem;
      color: #666;
      line-height: 1.35;
      margin-top: 4px;
    }
    
    .qv-actions {
      display: flex;
      gap: 10px;
      margin: 0;
      padding: 12px 16px;
      background: #fff;
      flex-wrap: wrap;
      justify-content: space-between;
      border-top: 1px solid #f0f0f0;
      flex-shrink: 0;
      border-radius: 0 0 16px 16px;
      width: 100%;
      box-sizing: border-box;
    }
    
    .qv-cancel-btn {
      flex: 1;
      min-width: 100px;
      padding: 10px 14px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      font-size: 0.9rem;
      font-weight: 700;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
    }
    .qv-cancel-btn:active {
      transform: scale(0.98);
      box-shadow: 0 2px 10px rgba(102, 126, 234, 0.2);
    }
    
    .qv-add-btn {
      flex: 1;
      min-width: 100px;
      padding: 10px 14px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      font-size: 0.9rem;
      font-weight: 700;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
    }
    .qv-add-btn:active {
      transform: scale(0.98);
      box-shadow: 0 2px 10px rgba(102, 126, 234, 0.2);
    }
    
    .qv-stepper {
      flex: 1;
      min-width: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 10px;
      padding: 0 10px;
      height: 40px;
    }
    
    .qv-step-btn {
      width: 26px;
      height: 26px;
      border: none;
      background: rgba(255, 255, 255, 0.3);
      color: #fff;
      border-radius: 6px;
      font-size: 1.1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }
    .qv-step-btn:active {
      background: rgba(255, 255, 255, 0.5);
    }
    
    .qv-qty {
      color: #fff;
      font-weight: 700;
      font-size: 0.95rem;
      min-width: 20px;
      text-align: center;
    }
  `]
})
export class ProductsPage implements OnInit, OnDestroy {
  readonly products = signal<any[]>([]);
  readonly adding = signal<number | null>(null);
  readonly toastOpen = signal(false);
  readonly toastMsg = signal('');
  readonly toastColor = signal('success');
  readonly cartCount = computed(() => this.cartState.items().length);
  readonly categoryName = signal('');
  readonly loading = signal(false);
  readonly searchTerm = signal('');
  readonly showQuickViewModal = signal(false);
  readonly selectedProductForModal = signal<any>(null);
  readonly imageZoom = signal(1);
  readonly imageRotation = signal(0);
  private zoomStartDistance = 0;
  private zoomStartScale = 1;

  private searchTimeout: any;
  private lastQuery = '';
  private destroy$ = new Subject<void>();

  productImage(product: any): string {
    return product?.imageUrl || '';
  }

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private cartState: CartState,
    private activityState: ActivityState
  ) {}

  ngOnInit(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((qp) => {
        const categoryId = qp.get('categoryId');
        const name = qp.get('categoryName');
        const query = qp.get('query') || '';
        this.lastQuery = query.trim();
        this.searchTerm.set(query);
        this.categoryName.set(name || 'Products');
        this.loadProducts(categoryId, query);
      });
    this.api.get<any>('/customer/cart')
      .pipe(takeUntil(this.destroy$))
      .subscribe((cart) => {
        this.cartState.setItems(cart?.items || []);
      });
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', () => this.onOnline());
    window.removeEventListener('offline', () => this.onOffline());
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(v: string) {
    this.searchTerm.set(v);
    const categoryId = this.route.snapshot.queryParamMap.get('categoryId');
    
    // Debounce search to avoid too many API calls
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      const query = (v || '').trim();
      if (query !== this.lastQuery) {
        this.lastQuery = query;
        this.loadProducts(categoryId, query);
      }
    }, 300);
  }

  loadProducts(categoryId: string | null, query: string) {
    this.lastQuery = (query || '').trim();
    const params: any = { page: 0, size: 50 };
    if (categoryId) params.categoryId = categoryId;
    if (query && query.trim()) params.query = query.trim();
    this.loading.set(true);
    this.api.get<any>('/catalog/products', params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.products.set(res?.content || []);
          this.loading.set(false);
        },
         error: (err) => {
          this.products.set([]);
          this.loading.set(false);
          this.toastMsg.set(this.getErrorMessage('Could not load products', err));
          this.toastColor.set('danger');
          this.toastOpen.set(true);
        }
      });
  }

  productBg(product: any) {
    const name = String(product?.name || '').toLowerCase();
    if (name.includes('banana') || name.includes('tomato')) return 'linear-gradient(135deg,#fff2cf,#ffe2a9)';
    if (name.includes('milk') || name.includes('bread')) return 'linear-gradient(135deg,#e7f4ff,#cde6ff)';
    if (name.includes('chips') || name.includes('juice')) return 'linear-gradient(135deg,#fff0dc,#ffd3a8)';
    if (name.includes('daal') || name.includes('dal') || name.includes('atta') || name.includes('rice')) return 'linear-gradient(135deg,#fff8dd,#f2e1ad)';
    if (name.includes('jeera')) return 'linear-gradient(135deg,#f4eadf,#e8d2b8)';
    if (name.includes('surf') || name.includes('dishwash')) return 'linear-gradient(135deg,#e3f7ff,#c6ebff)';
    if (name.includes('agarbatti')) return 'linear-gradient(135deg,#f3e9ff,#dfccff)';
    return 'linear-gradient(135deg,#edf3ff,#dde8fb)';
  }

  cartQty(productId: number): number {
    const item = this.cartState.items().find(i => Number(i.productId) === Number(productId));
    return item ? Number(item.quantity || 0) : 0;
  }

  addToCart(product: any) {
    const currentQty = this.cartQty(product.id);
    const newQty = currentQty + 1;
    this.adding.set(product.id);
    this.cartState.addOrIncrement(product);
    this.api.post('/customer/cart/items', { productId: product.id, quantity: newQty })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.adding.set(null);
          this.activityState.log('cart_add', `Added ${product.name} to cart`, { productId: product.id });
          if (currentQty === 0) {
            this.toastMsg.set('Added to cart!');
            this.toastColor.set('success');
            this.toastOpen.set(true);
          }
        },
        error: (err) => {
          this.adding.set(null);
          this.cartState.removeOrDecrement({ id: product.id }); // revert optimistic
          const msg = (!navigator.onLine || err?.status === 0)
            ? 'No internet — turn on Wi-Fi or mobile data'
            : (err?.error?.message || 'Could not add to cart');
          this.toastMsg.set(msg);
          this.toastColor.set('danger');
          this.toastOpen.set(true);
        }
      });
  }

  removeFromCart(product: any) {
    const currentQty = this.cartQty(product.id);
    this.cartState.removeOrDecrement({ id: product.id });
    const request$ = currentQty <= 1
      ? this.api.delete(`/customer/cart/items/${product.id}`)
      : this.api.post('/customer/cart/items', { productId: product.id, quantity: currentQty - 1 });
    request$.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {},
        error: () => { this.cartState.addOrIncrement(product); } // revert optimistic
      });
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
          this.toastMsg.set('Could not start checkout');
          this.toastColor.set('danger');
          this.toastOpen.set(true);
        }
      });
  }

  getDiscount(product: any): number {
    if (!product?.mrp || +product.mrp <= +product.sellingPrice) return 0;
    return Math.round(((+product.mrp - +product.sellingPrice) / +product.mrp) * 100);
  }

  getOriginalPrice(product: any): number {
    return product?.mrp || 0;
  }

  getBrandName(productName: string): string {
    const words = productName.split(' ');
    return words[0] || 'Fresh';
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

  onRefresh(event: any) {
    const categoryId = this.route.snapshot.queryParamMap.get('categoryId');
    const query = this.searchTerm();
    this.loadProducts(categoryId, query);
    setTimeout(() => {
      event.detail.complete();
    }, 500);
  }

  private getErrorMessage(defaultMsg: string, err: any): string {
    // Check if internet is offline
    if (!navigator.onLine) {
      return '📡 Check your internet connectivity';
    }
    
    // Check for network errors (status 0 indicates network failure)
    if (err?.status === 0) {
      return '📡 Check your internet connectivity';
    }
    
    return defaultMsg;
  }

  private onOnline(): void {
    // Internet is back! Reload products
    console.log('🟢 Internet connection restored - reloading products');
    const categoryId = this.route.snapshot.queryParamMap.get('categoryId');
    const query = this.searchTerm();
    this.loadProducts(categoryId, query);
  }

  private onOffline(): void {
    console.log('🔴 Internet connection lost');
  }

  openQuickView(product: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedProductForModal.set(product);
    this.showQuickViewModal.set(true);
  }

  closeQuickView(): void {
    this.imageZoom.set(1);
    this.zoomHintHidden.set(false);
    this.showQuickViewModal.set(false);
    setTimeout(() => this.selectedProductForModal.set(null), 200);
  }

  addToCartFromModal(product: any): void {
    this.addToCart(product);
  }

  // ═══════════════════════════════════════
  // ZOOM FUNCTIONALITY
  // ═══════════════════════════════════════
  readonly showZoomHint = signal(true);
  readonly zoomHintHidden = signal(false);

  private getTouchDistance(touches: TouchList): number {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      this.zoomHintHidden.set(true);
      this.zoomStartDistance = this.getTouchDistance(event.touches);
      this.zoomStartScale = this.imageZoom();
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 2) {
      event.preventDefault();
      const currentDistance = this.getTouchDistance(event.touches);
      if (this.zoomStartDistance > 0) {
        const ratio = currentDistance / this.zoomStartDistance;
        const newZoom = Math.min(Math.max(this.zoomStartScale * ratio, 1), 4);
        this.imageZoom.set(newZoom);
      }
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (event.touches.length < 2) {
      this.zoomStartDistance = 0;
      // Snap to valid zoom levels
      const currentZoom = this.imageZoom();
      if (currentZoom < 1.2) {
        this.imageZoom.set(1);
      } else if (currentZoom < 2) {
        this.imageZoom.set(1.5);
      } else {
        this.imageZoom.set(Math.min(currentZoom, 4));
      }
    }
  }

  onMouseWheel(event: WheelEvent): void {
    event.preventDefault();
    const currentZoom = this.imageZoom();
    const zoomStep = 0.2;
    let newZoom = currentZoom;
    
    if (event.deltaY < 0) {
      // Scroll up = zoom in
      newZoom = Math.min(currentZoom + zoomStep, 4);
    } else {
      // Scroll down = zoom out
      newZoom = Math.max(currentZoom - zoomStep, 1);
    }
    
    this.imageZoom.set(newZoom);
    this.zoomHintHidden.set(true);
  }

  resetZoom(event: Event): void {
    event.stopPropagation();
    this.imageZoom.set(1);
  }

  toggleZoomControls(): void {
    if (this.imageZoom() === 1) {
      this.zoomHintHidden.set(!this.zoomHintHidden());
    }
  }
}

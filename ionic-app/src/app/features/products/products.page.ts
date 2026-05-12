import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButton, IonBadge, IonToast, IonButtons, IonBackButton, IonSearchbar, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { CartState } from '../../core/state/cart.state';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';
import { ActivityState } from '../../core/state/activity.state';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonBadge, IonToast, IonButtons, IonBackButton, IonSearchbar, IonRefresher, IonRefresherContent, BottomNavComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ categoryName() || 'Products' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/cart">
            🛒 Cart <ion-badge color="danger" *ngIf="cartCount() > 0">{{ cartCount() }}</ion-badge>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar class="sticky-search-toolbar">
        <ion-searchbar
          placeholder="Search in products"
          [value]="searchTerm()"
          (ionInput)="onSearchInput($any($event).detail.value || '')">
        </ion-searchbar>
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
        <article class="item" *ngFor="let p of products(); let i = index" [style.animationDelay.ms]="i * 45">
          <div class="item-art" [class.has-photo]="p.imageUrl" [style.background]="p.imageUrl ? '#fff' : productBg(p)">
            <div class="discount-badge" *ngIf="+p.mrp > +p.sellingPrice">{{ getDiscount(p) }}%</div>
            <img class="art-image" [class.photo-img]="p.imageUrl" [src]="productImage(p)" [alt]="p.name">
          </div>
          <div class="meta">
            <div class="brand">{{ getBrandName(p.name) }}</div>
            <div class="name">{{ p.name }}</div>
            <div class="unit">{{ p.unit }}</div>
            <div class="pricing">
              <span class="original-price" *ngIf="+p.mrp > +p.sellingPrice">₹{{ p.mrp }}</span>
              <span class="sale-price">₹{{ p.sellingPrice }}</span>
            </div>
            <div class="delivery-time">📦 10 mins</div>
            <div class="action-row">
              <ion-button size="small" fill="outline" color="medium" (click)="addToCart(p)" [disabled]="adding() === p.id" class="add-btn">
                <span *ngIf="adding() !== p.id">➕ Add</span>
                <span *ngIf="adding() === p.id">Adding...</span>
              </ion-button>
              <ion-button size="small" (click)="buyNow(p)" [disabled]="adding() === p.id" class="buy-btn" expand="block">
                <span *ngIf="adding() !== p.id">Buy Now</span>
                <span *ngIf="adding() === p.id">Opening...</span>
              </ion-button>
            </div>
          </div>
        </article>
      </div>
    </ion-content>
    <app-bottom-nav></app-bottom-nav>
  `,
  styles: [`
    .sticky-search-toolbar {
      --background: rgba(255, 255, 255, 0.96);
      --min-height: 64px;
      padding: 0 8px;
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
      gap: 6px;
      width: 100%;
    }
    .add-btn {
      flex: 0 0 auto;
    }
    .buy-btn {
      flex: 1;
      --background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
      --color: #ffffff;
      --border-radius: 10px;
      --box-shadow: 0 6px 14px rgba(34, 197, 94, 0.26);
      font-weight: 700;
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
  `]
})
export class ProductsPage implements OnInit, OnDestroy {
  readonly products = signal<any[]>([]);
  readonly adding = signal<number | null>(null);
  readonly toastOpen = signal(false);
  readonly toastMsg = signal('');
  readonly toastColor = signal('success');
  readonly cartCount = signal(0);
  readonly categoryName = signal('');
  readonly loading = signal(false);
  readonly searchTerm = signal('');

  private searchTimeout: any;
  private lastQuery = '';
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

  productImage(product: any) {
    if (product?.imageUrl) return product.imageUrl;
    const name = String(product?.name || '').toLowerCase();
    const match = Object.keys(this.productPhotoByKeyword).find((k) => name.includes(k));
    if (match) return this.productPhotoByKeyword[match];
    return 'assets/items/placeholder.svg';
  }

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private cartState: CartState,
    private activityState: ActivityState
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((qp) => {
        const categoryId = qp.get('categoryId');
        const name = qp.get('categoryName');
        const query = qp.get('query') || '';
        this.lastQuery = query.trim();
        this.searchTerm.set(query);
        this.categoryName.set(name || (query ? 'Search Results' : 'Products'));
        this.loadProducts(categoryId, query);
      });
    this.api.get<any>('/customer/cart')
      .pipe(takeUntil(this.destroy$))
      .subscribe((cart) => this.cartCount.set(cart?.items?.length || 0));
  }

  ngOnDestroy(): void {
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
         error: () => {
          this.products.set([]);
          this.loading.set(false);
          this.toastMsg.set('Could not load products');
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

  addToCart(product: any) {
    this.adding.set(product.id);
    this.api.post('/customer/cart/items', { productId: product.id, quantity: 1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.adding.set(null);
          this.cartCount.set(this.cartCount() + 1);
          this.cartState.addOrIncrement(product);
          this.activityState.log('cart_add', `Added ${product.name} to cart`, { productId: product.id });
          this.toastMsg.set('Added to cart!');
          this.toastColor.set('success');
          this.toastOpen.set(true);
        },
        error: (err) => {
          this.adding.set(null);
          const msg = err?.error?.message || 'Could not add to cart';
          this.toastMsg.set(msg);
          this.toastColor.set('danger');
          this.toastOpen.set(true);
        }
      });
  }

  buyNow(product: any) {
    this.adding.set(product.id);
    this.api.post('/customer/cart/items', { productId: product.id, quantity: 1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.adding.set(null);
          this.cartCount.set(this.cartCount() + 1);
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

  onRefresh(event: any) {
    const categoryId = this.route.snapshot.queryParamMap.get('categoryId');
    const query = this.searchTerm();
    this.loadProducts(categoryId, query);
    setTimeout(() => {
      event.detail.complete();
    }, 500);
  }
}

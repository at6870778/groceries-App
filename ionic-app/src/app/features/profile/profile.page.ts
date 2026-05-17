import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';
import { LocationService } from '../../core/services/location.service';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonList, IonItem, IonLabel, IonModal } from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ActivityState } from '../../core/state/activity.state';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonList, IonItem, IonLabel, IonModal, BottomNavComponent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>My Profile</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="false" class="ion-padding profile-content" style="--padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px))">

      <!-- ===== USER CARD ===== -->
      <div class="user-card">
        <div class="avatar">{{ initials() }}</div>
        <div class="user-info">
          <ng-container *ngIf="!editingName()">
            <div class="user-name">{{ displayName() }}</div>
            <div class="user-phone">📱 {{ profile()?.phone }}</div>
            <button class="edit-name-btn" (click)="startEditName()">✏️ Edit Name</button>
          </ng-container>
          <ng-container *ngIf="editingName()">
            <input class="name-edit-input" [(ngModel)]="nameEdit" placeholder="Your name" maxlength="60" />
            <div class="name-edit-actions">
              <button class="btn-save-name" [disabled]="savingName()" (click)="saveName()">
                {{ savingName() ? 'Saving...' : 'Save' }}
              </button>
              <button class="btn-cancel-name" (click)="cancelEditName()">Cancel</button>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- ===== ADDRESSES ===== -->
      <div class="section-header">
        <h3>Saved Addresses</h3>
        <button class="add-addr-btn" (click)="openAddForm()">+ Add New</button>
      </div>

      <!-- ADD / EDIT BOTTOM SHEET -->
      <ion-modal
        [isOpen]="showForm()"
        [breakpoints]="[0, 1]"
        [initialBreakpoint]="1"
        [backdropDismiss]="true"
        (didDismiss)="closeForm()"
        class="addr-sheet">
        <ng-template>
          <div class="sheet-wrap">
            <div class="sheet-handle"></div>
            <div class="sheet-header">
              <span class="sheet-title">{{ editingId() ? 'Edit Address' : 'New Address' }}</span>
              <button class="sheet-close" (click)="closeForm()">✕</button>
            </div>
            <div class="sheet-body">
              <button class="detect-btn" type="button" (click)="detectAndFillLocation()" [disabled]="detecting()">
                {{ detecting() ? '📍 Detecting...' : '📍 Use My Current Location' }}
              </button>

              <div class="form-row">
                <label>Label <small>(Home / Work / Other)</small></label>
                <div class="label-chips">
                  <button class="label-chip" [class.active]="form.label === 'Home'" (click)="form.label = 'Home'">🏠 Home</button>
                  <button class="label-chip" [class.active]="form.label === 'Work'" (click)="form.label = 'Work'">🏢 Work</button>
                  <button class="label-chip" [class.active]="form.label === 'Other'" (click)="form.label = 'Other'">📌 Other</button>
                </div>
              </div>

              <div class="form-row">
                <label>Flat / House No., Street *</label>
                <input class="form-input" [(ngModel)]="form.line1" placeholder="e.g. B-12, Green Park">
              </div>
              <div class="form-row">
                <label>Area / Colony</label>
                <input class="form-input" [(ngModel)]="form.line2" placeholder="e.g. Sector 4, Vasant Vihar">
              </div>
              <div class="form-row two-col">
                <div>
                  <label>City *</label>
                  <input class="form-input" [(ngModel)]="form.city" placeholder="City">
                </div>
                <div>
                  <label>State *</label>
                  <input class="form-input" [(ngModel)]="form.state" placeholder="State">
                </div>
              </div>
              <div class="form-row two-col">
                <div>
                  <label>Pincode *</label>
                  <input class="form-input" [(ngModel)]="form.postalCode" placeholder="Pincode" type="tel" maxlength="6">
                </div>
                <div>
                  <label>Landmark</label>
                  <input class="form-input" [(ngModel)]="form.landmark" placeholder="Near...">
                </div>
              </div>
              <div class="form-row checkbox-row">
                <input type="checkbox" id="defaultChk" [(ngModel)]="form.isDefault">
                <label for="defaultChk">Set as default delivery address</label>
              </div>
              <div class="form-error" *ngIf="formError()">{{ formError() }}</div>
            </div>
            <div class="sheet-footer">
              <button class="btn-save" (click)="saveAddress()" [disabled]="saving()">
                {{ saving() ? 'Saving...' : (editingId() ? 'Update Address' : 'Save Address') }}
              </button>
            </div>
          </div>
        </ng-template>
      </ion-modal>

      <!-- ADDRESS LIST -->
      <div class="addr-list" *ngIf="addresses().length > 0; else noAddresses">
        <div class="addr-card" *ngFor="let a of addresses()" [class.default-addr]="a.isDefault">
          <div class="addr-top">
            <span class="addr-label">{{ a.label || 'Address' }}</span>
            <span class="default-badge" *ngIf="a.isDefault">✓ Default</span>
          </div>
          <div class="addr-text">{{ formatAddress(a) }}</div>
          <div class="addr-actions">
            <button class="addr-edit-btn" (click)="startEdit(a)">✏️ Edit</button>
            <button class="addr-del-btn" (click)="deleteAddress(a.id)">🗑️ Remove</button>
          </div>
        </div>
      </div>
      <ng-template #noAddresses>
        <div class="empty-addr" *ngIf="!showForm()">
          <p>No saved addresses yet.</p>
        </div>
      </ng-template>

      <!-- ===== RECENT ACTIVITY ===== -->
      <div class="section-header" style="margin-top:24px;">
        <h3>Recent Activity</h3>
        <button class="add-addr-btn danger" (click)="clearActivities()" *ngIf="activityState.items().length > 0">Clear All</button>
      </div>
      <ion-list *ngIf="activityState.items().length > 0; else noActivity">
        <ion-item *ngFor="let act of activityState.items().slice(0, 25)">
          <ion-label>
            <h3>{{ act.message }}</h3>
            <p>{{ act.timestamp | date:'medium' }}</p>
          </ion-label>
          <ion-button slot="end" size="small" fill="clear" color="danger" (click)="removeActivity(act.id)">✕</ion-button>
        </ion-item>
      </ion-list>
      <ng-template #noActivity>
        <p class="muted-text">No activity yet.</p>
      </ng-template>

      <!-- ===== HELP & SUPPORT ===== -->
      <div class="section-header" style="margin-top:24px;">
        <h3>Help & Support</h3>
      </div>
      <div class="support-card">
        <p class="support-text">Facing an issue? Reach out to us and our team will assist you.</p>
        <a class="support-link" [href]="'tel:' + supportContact().phoneNumber">{{ supportContact().phoneNumber }}</a>
        <a class="support-link" [href]="'mailto:' + supportContact().supportEmail">{{ supportContact().supportEmail }}</a>
        <a class="support-link" [href]="'mailto:' + supportContact().privacyEmail">{{ supportContact().privacyEmail }}</a>
        <p class="support-meta">Address: {{ supportContact().addressLine }}</p>
      </div>

      <ion-button expand="block" color="danger" style="margin-top:24px;" (click)="logout()">Logout</ion-button>

    </ion-content>
    <app-bottom-nav></app-bottom-nav>
  `,
  styles: [`
    .profile-content { --background: #f4f7ff; }

    /* User card */
    .user-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #fff;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 20px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.06);
    }
    .avatar {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      font-size: 1.3rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .user-name {
      font-weight: 700;
      font-size: 1.05rem;
      color: #1a1a1a;
    }
    .user-phone {
      font-size: 0.88rem;
      color: #6f7f95;
      margin-top: 3px;
    }
    .edit-name-btn {
      background: none;
      border: none;
      color: #667eea;
      font-size: 0.8rem;
      padding: 2px 0;
      margin-top: 4px;
      cursor: pointer;
    }
    .name-edit-input {
      width: 100%;
      border: 1.5px solid #667eea;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 0.95rem;
      outline: none;
      margin-bottom: 6px;
    }
    .name-edit-actions {
      display: flex;
      gap: 8px;
    }
    .btn-save-name {
      background: #667eea;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 5px 14px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-save-name:disabled { opacity: 0.6; }
    .btn-cancel-name {
      background: none;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 5px 12px;
      font-size: 0.85rem;
      cursor: pointer;
    }

    /* Section header */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .section-header h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #1a1a1a;
    }

    /* Help & support */
    .support-card {
      background: #fff;
      border-radius: 14px;
      padding: 14px;
      border: 1px solid #e8ecf5;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    }
    .support-text {
      margin: 0 0 10px;
      color: #44526b;
      font-size: 0.9rem;
      line-height: 1.35;
    }
    .support-link {
      display: block;
      text-decoration: none;
      color: #4f46e5;
      font-weight: 700;
      margin-bottom: 6px;
      word-break: break-word;
    }
    .support-link:last-of-type {
      margin-bottom: 10px;
    }
    .support-meta {
      margin: 0;
      color: #6f7f95;
      font-size: 0.82rem;
    }
    .add-addr-btn {
      background: #667eea;
      color: #fff;
      border: none;
      border-radius: 20px;
      padding: 5px 14px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }
    .add-addr-btn.danger { background: #e53935; }

    /* Address cards */
    .addr-list { display: flex; flex-direction: column; gap: 10px; }
    .addr-card {
      background: #fff;
      border-radius: 14px;
      padding: 12px 14px;
      border: 1.5px solid #e8eef8;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .addr-card.default-addr { border-color: #16a34a; background: #f0faf5; }
    .addr-top {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 5px;
    }
    .addr-label {
      font-weight: 700;
      font-size: 0.88rem;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .default-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      border-radius: 10px;
      padding: 2px 8px;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .addr-text { font-size: 0.88rem; color: #444; line-height: 1.5; }
    .addr-text.muted { color: #888; }
    .addr-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }
    .addr-edit-btn, .addr-del-btn {
      border: none;
      border-radius: 8px;
      padding: 5px 12px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .addr-edit-btn { background: #eef2ff; color: #4f46e5; }
    .addr-del-btn { background: #fff0f0; color: #e53935; }

    /* ── Bottom sheet ── */
    .sheet-wrap {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #fff;
      border-radius: 20px 20px 0 0;
    }
    .sheet-handle {
      width: 40px;
      height: 4px;
      background: #dde1ea;
      border-radius: 4px;
      margin: 10px auto 4px;
      flex-shrink: 0;
    }
    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px 12px;
      border-bottom: 1px solid #f0f3fa;
      flex-shrink: 0;
    }
    .sheet-title {
      font-size: 1rem;
      font-weight: 700;
      color: #1a1a1a;
    }
    .sheet-close {
      background: #f0f3fa;
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      font-size: 0.85rem;
      cursor: pointer;
      color: #555;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sheet-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .sheet-footer {
      padding: 12px 16px;
      padding-bottom: max(12px, env(safe-area-inset-bottom));
      border-top: 1px solid #f0f3fa;
      background: #fff;
      flex-shrink: 0;
    }
    /* label quick-chips */
    .label-chips {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }
    .label-chip {
      flex: 1;
      padding: 8px 4px;
      border: 1.5px solid #e8eef8;
      border-radius: 10px;
      background: #f7f9fc;
      font-size: 0.82rem;
      font-weight: 600;
      color: #555;
      cursor: pointer;
      text-align: center;
    }
    .label-chip.active {
      border-color: #667eea;
      background: #eef1ff;
      color: #4f46e5;
    }
    .form-row { margin-bottom: 10px; }
    .form-row label { display: block; font-size: 0.78rem; color: #6f7f95; font-weight: 600; margin-bottom: 4px; }
    .form-input {
      width: 100%;
      border: 1.5px solid #e8eef8;
      border-radius: 10px;
      padding: 9px 12px;
      font-size: 0.9rem;
      outline: none;
      background: #f7f9fc;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .form-input:focus { border-color: #667eea; background: #fff; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .checkbox-row { display: flex; align-items: center; gap: 8px; }
    .checkbox-row label { margin: 0; font-size: 0.85rem; color: #444; font-weight: 500; }
    .form-error { color: #e53935; font-size: 0.82rem; margin-bottom: 8px; }
    .btn-save {
      width: 100%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      border: none;
      border-radius: 12px;
      padding: 14px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.3px;
    }
    .btn-save:disabled { opacity: 0.55; cursor: not-allowed; }
    .detect-btn {
      width: 100%;
      background: #e8f5e9;
      color: #2e7d32;
      border: 1.5px solid #a5d6a7;
      border-radius: 10px;
      padding: 9px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 12px;
    }
    .detect-btn:disabled { opacity: 0.55; cursor: not-allowed; }

    .empty-addr { text-align: center; padding: 20px 0; color: #888; }
    .muted-text { color: #6f7f95; font-size: 0.9rem; }
  `]
})
export class ProfilePage implements OnInit, OnDestroy {
  readonly defaultSupportContact = {
    phoneNumber: '+919876543210',
    supportEmail: 'support@orderkro.in',
    privacyEmail: 'privacy@orderkro.in',
    addressLine: 'Hata Kushinagar, Uttar Pradesh'
  };
  readonly supportContact = signal({ ...this.defaultSupportContact });
  readonly profile = signal<any | null>(null);
  readonly addresses = signal<any[]>([]);
  readonly showForm = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly detecting = signal(false);
  readonly editingName = signal(false);
  readonly savingName = signal(false);
  nameEdit = '';

  private normalizeAddressPart(value: any): string {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  private appendAddressPart(parts: string[], seen: Set<string>, value: any, prefix = '') {
    const normalized = this.normalizeAddressPart(value);
    if (!normalized) {
      return;
    }

    const displayValue = prefix ? `${prefix}${normalized}` : normalized;
    const key = displayValue.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    parts.push(displayValue);
  }

  formatAddress(address: any): string {
    const parts: string[] = [];
    const seen = new Set<string>();

    this.appendAddressPart(parts, seen, address?.village);
    this.appendAddressPart(parts, seen, address?.landmark, 'Near By ');
    this.appendAddressPart(parts, seen, address?.line1);
    this.appendAddressPart(parts, seen, address?.line2);
    this.appendAddressPart(parts, seen, address?.city);
    this.appendAddressPart(parts, seen, address?.state);
    this.appendAddressPart(parts, seen, address?.postalCode);

    return parts.join(', ');
  }

  displayName(): string {
    const p = this.profile();
    if (!p) return '';
    const name = p.fullName || '';
    // If name is just the phone number (our fallback), show phone prominently
    if (!name || name === p.phone) return p.phone;
    return name;
  }

  startEditName() {
    this.nameEdit = this.profile()?.fullName === this.profile()?.phone ? '' : (this.profile()?.fullName || '');
    this.editingName.set(true);
  }

  cancelEditName() {
    this.editingName.set(false);
    this.nameEdit = '';
  }

  saveName() {
    const name = this.nameEdit.trim();
    if (!name) return;
    this.savingName.set(true);
    this.api.put('/customer/profile', { fullName: name })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.profile.set(res);
          this.savingName.set(false);
          this.editingName.set(false);
        },
        error: () => {
          this.savingName.set(false);
        }
      });
  }

  form = {
    label: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    village: '',
    landmark: '',
    latitude: null as number | null,
    longitude: null as number | null,
    isDefault: false
  };

  private destroy$ = new Subject<void>();

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private locationService: LocationService,
    public activityState: ActivityState
  ) {}

  ngOnInit(): void {
    this.loadSupportContact();
    this.api.get('/customer/profile')
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => this.profile.set(res));
    this.api.get<any[]>('/customer/profile/addresses')
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => {
        const list = res || [];
        this.addresses.set(list);
        // Auto-detect and save address if user has none
        if (list.length === 0) {
          this.autoDetectAndSaveAddress();
        }
      }, error: () => {} });
  }

  loadSupportContact() {
    this.api.get<any>('/public/support-contact')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.supportContact.set({
            phoneNumber: String(res?.phoneNumber ?? this.defaultSupportContact.phoneNumber).trim(),
            supportEmail: String(res?.supportEmail ?? this.defaultSupportContact.supportEmail).trim(),
            privacyEmail: String(res?.privacyEmail ?? this.defaultSupportContact.privacyEmail).trim(),
            addressLine: String(res?.addressLine ?? this.defaultSupportContact.addressLine).trim()
          });
        },
        error: () => this.supportContact.set({ ...this.defaultSupportContact })
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initials(): string {
    const name = this.displayName();
    if (!name) return '?';
    // If it's a phone number, show first 2 digits
    if (/^\d+$/.test(name)) return name.slice(0, 2);
    return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?';
  }

  loadAddresses() {
    this.api.get<any[]>('/customer/profile/addresses')
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => this.addresses.set(res || []), error: () => {} });
  }

  private async autoDetectAndSaveAddress() {
    try {
      const loc = await this.locationService.detectCurrentLocation();
      const structured = await this.reverseGeocode(loc.latitude, loc.longitude);
      if (!structured.city) return; // not enough data to auto-save
      const payload = {
        label: 'Home',
        line1: structured.road || structured.suburb || 'My Location',
        line2: structured.suburb || '',
        city: structured.city,
        state: structured.state,
        postalCode: structured.postcode || '',
        village: '',
        landmark: '',
        latitude: loc.latitude,
        longitude: loc.longitude,
        isDefault: true
      };
      this.api.post<any>('/customer/profile/addresses', payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: () => this.loadAddresses(), error: () => {} });
    } catch (_) {
      // Silently skip — location permission denied or unavailable
    }
  }

  async detectAndFillLocation() {
    this.detecting.set(true);
    try {
      const loc = await this.locationService.detectCurrentLocation();
      const structured = await this.reverseGeocode(loc.latitude, loc.longitude);
      this.form.line1 = structured.road || structured.suburb || this.form.line1;
      this.form.line2 = structured.suburb || this.form.line2;
      this.form.city = structured.city || this.form.city;
      this.form.state = structured.state || this.form.state;
      this.form.postalCode = structured.postcode || this.form.postalCode;
      this.form.latitude = loc.latitude;
      this.form.longitude = loc.longitude;
    } catch (_) {
      this.formError.set('Could not detect location. Please fill manually.');
    } finally {
      this.detecting.set(false);
    }
  }

  private async reverseGeocode(lat: number, lng: number): Promise<any> {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    const a = data.address || {};
    return {
      road: a.road || a.pedestrian || a.footway || '',
      suburb: a.suburb || a.neighbourhood || a.quarter || '',
      city: a.city || a.town || a.village || a.county || '',
      state: a.state || '',
      postcode: a.postcode || ''
    };
  }

  openAddForm() {
    this.editingId.set(null);
    this.form = { label: 'Home', line1: '', line2: '', city: '', state: '', postalCode: '', village: '', landmark: '', latitude: null, longitude: null, isDefault: this.addresses().length === 0 };
    this.formError.set('');
    this.showForm.set(true);
  }

  startEdit(a: any) {
    this.editingId.set(a.id);
    this.form = {
      label: a.label || '',
      line1: a.line1 || '',
      line2: a.line2 || '',
      city: a.city || '',
      state: a.state || '',
      postalCode: a.postalCode || '',
      village: a.village || '',
      landmark: a.landmark || '',
      latitude: a.latitude ? Number(a.latitude) : null,
      longitude: a.longitude ? Number(a.longitude) : null,
      isDefault: a.isDefault || false
    };
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingId.set(null);
    this.formError.set('');
  }

  saveAddress() {
    if (!this.form.line1.trim() || !this.form.city.trim() || !this.form.state.trim() || !this.form.postalCode.trim()) {
      this.formError.set('Please fill in Address Line 1, City, State and Pincode.');
      return;
    }
    if (!this.form.label.trim()) this.form.label = 'Home';
    this.saving.set(true);
    this.formError.set('');

    const payload = { ...this.form };
    const id = this.editingId();
    const req = id
      ? this.api.put<any>(`/customer/profile/addresses/${id}`, payload)
      : this.api.post<any>('/customer/profile/addresses', payload);

    req.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadAddresses();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message || 'Could not save address. Try again.');
      }
    });
  }

  deleteAddress(id: number) {
    if (!confirm('Remove this address?')) return;
    this.api.delete(`/customer/profile/addresses/${id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.loadAddresses(), error: () => {} });
  }

  logout() {
    this.auth.clearTokens();
    window.location.href = '/';
  }

  removeActivity(id: string) { this.activityState.remove(id); }
  clearActivities() { this.activityState.clear(); }
}


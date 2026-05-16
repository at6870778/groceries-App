import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { LocationService } from '../../core/services/location.service';
import { SyncService } from '../../core/services/sync.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton],
  template: `
    <!-- LOCATION PERMISSION OVERLAY (Blinkit-style) -->
    <div class="loc-overlay" *ngIf="showLocationPrompt">
      <div class="loc-card">
        <div class="loc-pin">📍</div>
        <h3>Allow OrderKro to access your location?</h3>
        <p>We use your location to show nearby stores and deliver right to your door</p>
        <button class="loc-allow-btn" (click)="allowLocation()">Allow Location Access</button>
        <button class="loc-skip-btn" (click)="skipLocation()">Not Now</button>
      </div>
    </div>

    <ion-content [fullscreen]="false" class="main-content">

      <!-- ========== STEP 1: PHONE ========== -->
      <div *ngIf="!otpSent" class="page-wrapper">

        <!-- BRAND LOGO (top, full width) -->
        <div class="brand-hero">
          <img class="app-logo-img" src="assets/orderkro-logo.png" alt="OrderKro">
        </div>

        <!-- PRODUCT BANNER SLIDER -->
        <div class="banner-wrap">
          <div class="banner-track" [style.transform]="'translateX(-' + (currentSlide * 100) + '%)'">
            <div class="banner-slide" *ngFor="let item of bannerItems"
                 [style.background]="item.bg">
              <img class="banner-img" [src]="item.image" [alt]="item.title">
              <div class="banner-text">
                <div class="banner-title">{{ item.title }}</div>
                <div class="banner-sub">{{ item.sub }}</div>
              </div>
            </div>
          </div>
          <div class="slider-dots">
            <span *ngFor="let item of bannerItems; let i = index"
                  class="dot" [class.active-dot]="i === currentSlide"></span>
          </div>
        </div>

        <!-- TAGLINE -->
        <!-- PHONE INPUT -->
        <div class="input-section">

          <!-- tagline + loc chip moved inside so they sit right above the phone field -->
          <div class="tagline-row">
            <p class="tagline">Karo Order, Kahi Bhi Kuch Bhi! 🛍️</p>
          </div>
          <div class="welcome-back" *ngIf="mode === 'CUSTOMER' && isReturningUser()">
            Welcome back, {{ returningDisplayName() }}
          </div>
          <div class="loc-chip" *ngIf="locationService.currentLocation() as loc">
            <span>📍</span>
            <span class="loc-chip-text">{{ loc.address || 'Detecting location…' }}</span>
          </div>
          <div class="phone-row">
            <span class="country-code">+91</span>
            <input
              class="phone-input"
              type="tel"
              inputmode="numeric"
              maxlength="10"
              placeholder="Enter Mobile Number"
              [value]="phone"
              (input)="onPhoneInput($event)">
          </div>

          <ion-button
            expand="block"
            class="continue-btn"
            [disabled]="!isPhoneValid || loading"
            (click)="sendOtp()">
            {{ loading ? 'Sending...' : 'Continue' }}
          </ion-button>

          <!-- MODE TOGGLE (subtle) -->
          <div class="mode-row">
            <button class="mode-btn" [class.mode-active]="mode==='CUSTOMER'" (click)="mode='CUSTOMER'">
              🛍️ Shop
            </button>
            <button class="mode-btn" [class.mode-active]="mode==='DELIVERY_BOY'" (click)="mode='DELIVERY_BOY'">
              🚴 Deliver
            </button>
          </div>

          <p class="terms-text">By continuing, you agree to our <span class="terms-link">Terms &amp; Conditions</span></p>

          <!-- sendOtp error shown inline -->
          <div class="error-banner" *ngIf="error && !otpSent">{{ error }}</div>
        </div>
      </div>

      <!-- ========== STEP 2: OTP ========== -->
      <div *ngIf="otpSent" class="page-wrapper otp-page">

        <div class="otp-header">
          <div class="otp-header-text">
            <h2>Verify OTP</h2>
            <p>Sent to +91 {{ phone }}</p>
            <button class="change-number-btn" (click)="changeNumber()">✏️ Wrong number? Change</button>
          </div>
        </div>

        <!-- 6 digit boxes (box-0 carries autocomplete for SMS autofill) -->
        <div class="otp-boxes">
          <input id="otpbox-0" class="otp-box" type="tel" inputmode="numeric" maxlength="1" autocomplete="one-time-code" [value]="otpDigits[0]" (input)="onOtpInput(0,$event)" (change)="onOtpInput(0,$event)" (keydown)="onOtpKeydown(0,$event)" (paste)="onOtpPaste($event)">
          <input id="otpbox-1" class="otp-box" type="tel" inputmode="numeric" maxlength="1" [value]="otpDigits[1]" (input)="onOtpInput(1,$event)" (change)="onOtpInput(1,$event)" (keydown)="onOtpKeydown(1,$event)">
          <input id="otpbox-2" class="otp-box" type="tel" inputmode="numeric" maxlength="1" [value]="otpDigits[2]" (input)="onOtpInput(2,$event)" (change)="onOtpInput(2,$event)" (keydown)="onOtpKeydown(2,$event)">
          <input id="otpbox-3" class="otp-box" type="tel" inputmode="numeric" maxlength="1" [value]="otpDigits[3]" (input)="onOtpInput(3,$event)" (change)="onOtpInput(3,$event)" (keydown)="onOtpKeydown(3,$event)">
          <input id="otpbox-4" class="otp-box" type="tel" inputmode="numeric" maxlength="1" [value]="otpDigits[4]" (input)="onOtpInput(4,$event)" (change)="onOtpInput(4,$event)" (keydown)="onOtpKeydown(4,$event)">
          <input id="otpbox-5" class="otp-box" type="tel" inputmode="numeric" maxlength="1" [value]="otpDigits[5]" (input)="onOtpInput(5,$event)" (change)="onOtpInput(5,$event)" (keydown)="onOtpKeydown(5,$event)">
        </div>

        <!-- Name field -->
        <div class="name-row">
          <input class="name-input" type="text" [(ngModel)]="fullName" placeholder="Your Name (for first-time users)">
        </div>

        <div class="otp-btn-wrap">
          <ion-button
            expand="block"
            class="continue-btn"
            [disabled]="!isOtpComplete || loading"
            (click)="verifyOtp()">
            {{ loading ? 'Verifying...' : 'Verify &amp; Continue' }}
          </ion-button>
        </div>

        <!-- OTP error shown inline so it's always visible above the keyboard -->
        <div class="error-banner otp-error-inline" *ngIf="error">{{ error }}</div>

        <div class="resend-row">
          <button class="resend-btn" [disabled]="resendSecondsRemaining > 0" (click)="resendOtp()">
            {{ resendSecondsRemaining > 0 ? ('Resend OTP in ' + resendSecondsRemaining + 's') : 'Resend OTP' }}
          </button>
        </div>
      </div>

    </ion-content>
  `,
  styles: [`
    /* === LOCATION OVERLAY === */
    .loc-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 9999;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .loc-card {
      background: #fff;
      width: 100%;
      border-radius: 24px 24px 0 0;
      padding: 32px 24px 48px;
      text-align: center;
      animation: slideUp 0.35s ease;
    }

    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .loc-pin {
      font-size: 52px;
      margin-bottom: 12px;
      display: block;
      animation: bounce 1.5s infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    .loc-card h3 {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 10px;
      line-height: 1.3;
    }

    .loc-card p {
      font-size: 14px;
      color: #6f7f95;
      margin: 0 0 24px;
      line-height: 1.5;
    }

    .loc-allow-btn {
      display: block;
      width: 100%;
      padding: 16px;
      border-radius: 14px;
      border: none;
      background: #1ba672;
      color: #fff;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      margin-bottom: 12px;
    }

    .loc-skip-btn {
      display: block;
      width: 100%;
      padding: 14px;
      border-radius: 14px;
      border: 1.5px solid #e0e0e0;
      background: transparent;
      color: #6f7f95;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }

    /* === MAIN CONTENT === */
    .main-content {
      --background: #fff;
    }

    .page-wrapper {
      height: 100%;             /* fill full ion-content height */
      display: flex;
      flex-direction: column;
      background: #fff;
      padding-top: env(safe-area-inset-top, 0px);
      overflow: hidden;
    }

    /* === BANNER SLIDER === */
    .banner-wrap {
      position: relative;
      overflow: hidden;
      height: 120px;
      flex-shrink: 0;
    }

    .banner-track {
      display: flex;
      height: 100%;
      transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .banner-slide {
      flex: 0 0 100%;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      padding: 0 24px;
      gap: 16px;
    }

    .banner-img {
      width: 72px;
      height: 72px;
      object-fit: contain;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.25));
      animation: floatAnim 3s ease-in-out infinite;
    }

    @keyframes floatAnim {
      0%, 100% { transform: translateY(0) rotate(-5deg); }
      50% { transform: translateY(-12px) rotate(5deg); }
    }

    .banner-text {
      text-align: center;
      color: #fff;
    }

    .banner-title {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.3px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .banner-sub {
      font-size: 12px;
      opacity: 0.9;
      margin-top: 2px;
      text-shadow: 0 1px 4px rgba(0,0,0,0.15);
    }

    .slider-dots {
      position: absolute;
      bottom: 10px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      gap: 6px;
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255,255,255,0.5);
      transition: all 0.3s ease;
    }

    .active-dot {
      background: #fff;
      width: 18px;
      border-radius: 3px;
    }

    /* === BRAND HERO === */
    .brand-hero {
      width: 100%;
      padding: 0;
      margin: 0;
      line-height: 0;
      flex: 1;               /* grow to fill all available space between status bar and banner */
      min-height: 0;         /* allow flex shrink below natural size */
      background: #000;
      border-bottom: 3px solid #1ba672;
      overflow: hidden;
    }

    .app-logo-img {
      width: 100%;
      height: 100%;          /* fill the full flex space of brand-hero */
      object-fit: cover;
      object-position: center 20%;
      display: block;
    }

    /* === TAGLINE ROW (now inside input-section) === */
    .tagline-row {
      padding: 0 0 6px;
    }

    .tagline {
      font-size: 16px;
      color: #1a1a1a;
      font-weight: 700;
      line-height: 1.4;
      margin: 0;
      text-align: center;
    }

    /* === LOCATION CHIP === */
    .loc-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 10px;
      padding: 7px 14px;
      background: #f0faf5;
      border-radius: 20px;
      border: 1px solid #c8e6c9;
      width: fit-content;
    }

    .loc-chip-text {
      font-size: 13px;
      color: #2e7d32;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 240px;
    }

    /* === INPUT SECTION === */
    .input-section {
      padding: 14px 20px 16px;
      flex: 0 0 auto;        /* natural height — logo above fills all dead space */
      display: flex;
      flex-direction: column;
    }

    .phone-row {
      display: flex;
      align-items: center;
      border: 2px solid #e8ecf4;
      border-radius: 14px;
      overflow: hidden;
      background: #f7f9fc;
      margin-bottom: 14px;
      transition: border-color 0.2s;
    }

    .phone-row:focus-within {
      border-color: #1ba672;
    }

    .country-code {
      padding: 0 14px;
      font-size: 16px;
      font-weight: 700;
      color: #1a1a1a;
      border-right: 2px solid #e8ecf4;
      height: 54px;
      display: flex;
      align-items: center;
      background: #fff;
      flex-shrink: 0;
    }

    .phone-input {
      flex: 1;
      border: none;
      outline: none;
      padding: 0 16px;
      font-size: 17px;
      color: #1a1a1a;
      background: transparent;
      height: 54px;
      letter-spacing: 1px;
    }

    .phone-input::placeholder {
      color: #b0bec5;
      font-size: 15px;
      letter-spacing: 0;
    }

    .continue-btn {
      --background: #1ba672;
      --background-activated: #158a5e;
      --background-hover: #158a5e;
      --border-radius: 14px;
      --box-shadow: 0 6px 20px rgba(27, 166, 114, 0.35);
      height: 54px;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 0.3px;
      margin: 0 0 14px;
    }

    .continue-btn.button-disabled {
      --background: #d0d0d0;
      --box-shadow: none;
      opacity: 1;
    }

    /* === MODE TOGGLE === */
    .mode-row {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
    }

    .mode-btn {
      flex: 1;
      padding: 10px;
      border: 1.5px solid #e0e0e0;
      border-radius: 10px;
      background: transparent;
      font-size: 13px;
      font-weight: 600;
      color: #888;
      cursor: pointer;
      transition: all 0.2s;
    }

    .mode-active {
      border-color: #1ba672;
      color: #1ba672;
      background: #f0faf5;
    }

    .terms-text {
      font-size: 12px;
      color: #9e9e9e;
      text-align: center;
      margin: 0;
    }

    .terms-link {
      color: #1ba672;
      font-weight: 600;
    }

    /* === OTP PAGE === */
    .otp-page {
      padding: 0;
    }

    .otp-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 50px 20px 24px;
      background: #f7f9fc;
    }

    .back-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1.5px solid #e0e0e0;
      background: #fff;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .otp-header-text h2 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 2px;
      color: #1a1a1a;
    }

    .otp-header-text p {
      font-size: 14px;
      color: #6f7f95;
      margin: 0;
    }

    /* === OTP BOXES === */
    .otp-boxes {
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 36px 20px 24px;
    }

    .otp-box {
      width: 48px;
      height: 56px;
      border-radius: 12px;
      border: 2px solid #e8ecf4;
      background: #f7f9fc;
      text-align: center;
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      outline: none;
      transition: border-color 0.2s, transform 0.15s;
    }

    .otp-box:focus {
      border-color: #1ba672;
      background: #fff;
      transform: scale(1.05);
    }

    /* === NAME INPUT === */
    .name-row {
      padding: 0 20px 16px;
    }

    .welcome-back {
      margin: 4px 0 10px;
      color: #1f7a44;
      font-size: 14px;
      font-weight: 700;
      text-align: left;
      padding-left: 2px;
    }

    .name-input {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e8ecf4;
      border-radius: 14px;
      background: #f7f9fc;
      font-size: 15px;
      color: #1a1a1a;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }

    .name-input:focus {
      border-color: #1ba672;
    }

    .name-input::placeholder {
      color: #b0bec5;
    }

    .otp-btn-wrap {
      padding: 0 20px;
    }

    /* === RESEND === */
    .resend-row {
      text-align: center;
      padding: 8px 0 16px;
    }

    .resend-btn {
      background: none;
      border: none;
      color: #1ba672;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      padding: 8px 16px;
    }

    .resend-btn:disabled {
      color: #9e9e9e;
      cursor: default;
    }

    .change-number-btn {
      background: none;
      border: none;
      color: #667eea;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 0 0;
      text-decoration: underline;
      text-underline-offset: 2px;
      display: inline-block;
    }

    /* === ERROR === */
    .error-banner {
      margin: 0 20px 16px;
      padding: 12px 16px;
      background: #ffebee;
      color: #c62828;
      border-radius: 12px;
      font-size: 14px;
      border-left: 3px solid #c62828;
    }
  `]
})
export class DeliveryLoginPage implements OnInit, OnDestroy {
  // Mode
  mode: 'CUSTOMER' | 'DELIVERY_BOY' = 'CUSTOMER';

  // Location dialog
  showLocationPrompt = false;

  // Banner
  bannerItems = [
    { image: 'assets/items/banana.svg',    title: 'Fresh Banana',      sub: 'Farm fresh, delivered in minutes',    bg: 'linear-gradient(135deg, #f7971e, #ffd200)' },
    { image: 'assets/items/milk.svg',       title: 'Pure Fresh Milk',   sub: 'Cold & pure, straight to your door',  bg: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
    { image: 'assets/items/tomato.svg',     title: 'Juicy Tomatoes',    sub: 'Red, ripe & ready to cook',           bg: 'linear-gradient(135deg, #f5515f, #9f041b)' },
    { image: 'assets/items/bread.svg',      title: 'Soft Fresh Bread',  sub: 'Baked fresh, delivered warm',         bg: 'linear-gradient(135deg, #f093fb, #f5576c)' },
    { image: 'assets/items/juice.svg',      title: 'Cool Juices',       sub: 'Refreshing drinks for every mood',    bg: 'linear-gradient(135deg, #56ab2f, #a8e063)' },
    { image: 'assets/items/chips.svg',      title: 'Crispy Snacks',     sub: 'Anytime hunger? Sorted!',             bg: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' },
    { image: 'assets/items/rice.svg',       title: 'Basmati Rice',      sub: 'Premium quality, bulk orders welcome', bg: 'linear-gradient(135deg, #ffecd2, #e07b39)' },
    { image: 'assets/items/atta.svg',       title: 'Fresh Atta',        sub: 'Stone-ground, healthy & pure',        bg: 'linear-gradient(135deg, #d4a843, #a07820)' },
  ];
  currentSlide = 0;
  private slideTimer: number | null = null;

  // Phone step
  phone = '';
  get isPhoneValid(): boolean { return /^[0-9]{10}$/.test(this.phone); }

  // OTP step
  otpDigits: string[] = ['', '', '', '', '', ''];
  get otp(): string { return this.otpDigits.join(''); }
  get isOtpComplete(): boolean { return this.otpDigits.every(d => d.length === 1); }
  fullName = '';
  otpRequestId = '';
  get otpSent(): boolean { return this._otpSent; }
  private _otpSent = false;

  // Cooldown
  resendSecondsRemaining = 0;
  private resendTimerId: number | null = null;

  // State
  loading = false;
  error = '';

  private readonly knownUsersStorageKey = 'orderkro_known_customer_phones';

  constructor(
    private auth: AuthService,
    private router: Router,
    private sync: SyncService,
    public locationService: LocationService
  ) {}

  ngOnInit(): void {
    this.startSlider();
    // Show prompt if: never asked before, OR location not yet detected
    const locationAsked = localStorage.getItem('orderkro_location_asked');
    const alreadyHasLocation = !!this.locationService.currentLocation();
    if (!locationAsked || !alreadyHasLocation) {
      this.showLocationPrompt = true;
    }
  }

  ngOnDestroy(): void {
    if (this.slideTimer !== null) window.clearInterval(this.slideTimer);
    this.clearResendTimer();
  }

  private startSlider(): void {
    this.slideTimer = window.setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.bannerItems.length;
    }, 2500);
  }

  allowLocation(): void {
    localStorage.setItem('orderkro_location_asked', '1');
    this.showLocationPrompt = false;
    this.locationService.detectCurrentLocation().catch(() => {});
  }

  skipLocation(): void {
    localStorage.setItem('orderkro_location_asked', '1');
    this.showLocationPrompt = false;
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/[^0-9]/g, '').slice(0, 10);
    input.value = clean;
    this.phone = clean;
    this.error = '';
  }

  isReturningUser(): boolean {
    if (!/^[0-9]{10}$/.test(this.phone)) return false;
    return this.getKnownCustomerPhones().includes(this.phone);
  }

  returningDisplayName(): string {
    const rememberedName = localStorage.getItem(this.customerNameKey(this.phone)) || '';
    const trimmed = rememberedName.trim();
    return trimmed || this.phone;
  }

  changeNumber(): void {
    this._otpSent = false;
    this.otpDigits = Array(6).fill('');
    this.error = '';
    this.resendSecondsRemaining = 0;
    if (this.resendTimerId !== null) {
      clearInterval(this.resendTimerId);
      this.resendTimerId = null;
    }
  }

  sendOtp(): void {
    if (!this.isPhoneValid || this.loading) return;
    this.loading = true;
    this.error = '';
    this.auth.requestOtp(this.phone).subscribe({
      next: (res) => {
        this.otpRequestId = res?.data || '';
        this._otpSent = true;
        this.startResendCooldown();
        this.loading = false;
        // Try Web OTP API (Android Chrome) to auto-fill SMS OTP
        this.listenForSmsOtp();
      },
      error: (err) => {
        this.error = this.getErrorMessage(err, 'Could not send OTP. Check your connection.');
        this.loading = false;
      }
    });
  }

  onOtpInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    // Take only the last digit typed (handles paste of full OTP too)
    const val = input.value.replace(/[^0-9]/g, '').slice(-1);
    input.value = val;
    // Create new array reference so Angular detects change and re-evaluates isOtpComplete
    const newDigits = [...this.otpDigits];
    newDigits[index] = val;
    this.otpDigits = newDigits;
    if (val && index < 5) {
      const next = document.getElementById('otpbox-' + (index + 1)) as HTMLInputElement;
      if (next) { next.value = ''; next.focus(); }
    }
  }

  onOtpKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      if (!this.otpDigits[index] && index > 0) {
        const newDigits = [...this.otpDigits];
        newDigits[index - 1] = '';
        this.otpDigits = newDigits;
        const prev = document.getElementById('otpbox-' + (index - 1)) as HTMLInputElement;
        if (prev) { prev.value = ''; prev.focus(); }
      } else {
        const newDigits = [...this.otpDigits];
        newDigits[index] = '';
        this.otpDigits = newDigits;
      }
    }
  }

  /** Distributes a pasted 6-digit OTP across all boxes */
  onOtpPaste(event: ClipboardEvent): void {
    const pasted = (event.clipboardData?.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    event.preventDefault();
    const newDigits = [...this.otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
      const box = document.getElementById('otpbox-' + i) as HTMLInputElement;
      if (box) box.value = pasted[i] || '';
    }
    this.otpDigits = newDigits;
    const lastFilled = Math.min(pasted.length, 5);
    const lastBox = document.getElementById('otpbox-' + lastFilled) as HTMLInputElement;
    if (lastBox) lastBox.focus();
    if (pasted.length === 6) setTimeout(() => this.verifyOtp(), 150);
  }

  /** Web OTP API — silently fills OTP on Android Chrome if SMS matches format */
  private listenForSmsOtp(): void {
    if (!('OTPCredential' in window)) return;
    const ac = new AbortController();
    // Abort after 2 minutes so it doesn't linger
    const timer = setTimeout(() => ac.abort(), 120_000);
    (navigator.credentials as any).get({ otp: { transport: ['sms'] }, signal: ac.signal })
      .then((otp: any) => {
        clearTimeout(timer);
        const code = String(otp?.code || '').replace(/[^0-9]/g, '').slice(0, 6);
        if (code.length !== 6) return;
        const newDigits = code.split('');
        this.otpDigits = newDigits;
        for (let i = 0; i < 6; i++) {
          const box = document.getElementById('otpbox-' + i) as HTMLInputElement;
          if (box) box.value = newDigits[i];
        }
        setTimeout(() => this.verifyOtp(), 150);
      })
      .catch(() => { clearTimeout(timer); /* user dismissed or API unavailable */ });
  }

  verifyOtp(): void {
    // Sync DOM values into otpDigits in case SMS auto-fill bypassed (input) events
    for (let i = 0; i < 6; i++) {
      const el = document.getElementById('otpbox-' + i) as HTMLInputElement;
      if (el && el.value && !this.otpDigits[i]) {
        const newDigits = [...this.otpDigits];
        newDigits[i] = el.value.replace(/[^0-9]/g, '').slice(-1);
        this.otpDigits = newDigits;
      }
    }
    if (!this.isOtpComplete || this.loading) return;
    this.loading = true;
    this.error = '';
    const name = this.fullName.trim(); // empty string is fine — backend will use phone as fallback
    this.auth.loginWithRole(this.phone, name, this.mode, this.otp, this.otpRequestId).subscribe({
      next: (res) => {
        const token = res?.data?.token || res?.data?.accessToken;
        if (!token) {
          this.error = 'Login failed. Token not received.';
          this.loading = false;
          return;
        }
        this.auth.saveToken(token, this.mode, res?.data?.phone || this.phone);
        if (this.mode === 'CUSTOMER') {
          const loggedInPhone = String(res?.data?.phone || this.phone || '').trim();
          const candidateName = String(res?.data?.fullName || name || '').trim();
          this.rememberCustomer(loggedInPhone, candidateName || loggedInPhone);
        }
        this.saveLocationOnLogin();
        if (this.mode === 'CUSTOMER') this.sync.syncCart(); // pull saved cart immediately
        this.loading = false;
        // replaceUrl: true clears the login page from back-stack so Android back button exits the app
        this.router.navigateByUrl(this.mode === 'DELIVERY_BOY' ? '/delivery/orders' : '/home', { replaceUrl: true });
      },
      error: (err) => {
        this.error = this.getErrorMessage(err, 'Login failed. Please try again.');
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this._otpSent = false;
    this.otpDigits = ['', '', '', '', '', ''];
    this.error = '';
  }

  resendOtp(): void {
    if (this.resendSecondsRemaining > 0 || this.loading) return;
    this.loading = true;
    this.error = '';
    const request = this.otpRequestId
      ? this.auth.retryOtp(this.phone, this.otpRequestId)
      : this.auth.requestOtp(this.phone);
    request.subscribe({
      next: (res) => {
        if (res?.data) this.otpRequestId = res.data;
        this.otpDigits = ['', '', '', '', '', ''];
        this.startResendCooldown();
        this.loading = false;
      },
      error: (err) => {
        this.error = this.getErrorMessage(err, 'Could not resend OTP.');
        this.loading = false;
      }
    });
  }

  private startResendCooldown(seconds = 30): void {
    this.clearResendTimer();
    this.resendSecondsRemaining = seconds;
    this.resendTimerId = window.setInterval(() => {
      this.resendSecondsRemaining = Math.max(0, this.resendSecondsRemaining - 1);
      if (this.resendSecondsRemaining === 0) this.clearResendTimer();
    }, 1000);
  }

  private clearResendTimer(): void {
    if (this.resendTimerId !== null) {
      window.clearInterval(this.resendTimerId);
      this.resendTimerId = null;
    }
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    const httpErr = err as HttpErrorResponse;
    const backendMsg = httpErr?.error?.message;
    if (typeof backendMsg === 'string' && backendMsg.trim()) return backendMsg;
    return fallback;
  }

  private saveLocationOnLogin(): void {
    const loc = this.locationService.currentLocation();
    if (loc) {
      sessionStorage.setItem('user_location_at_login', JSON.stringify({
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: loc.address,
        timestamp: new Date().toISOString()
      }));
    }
  }

  private customerNameKey(phone: string): string {
    return `orderkro_customer_name_${phone}`;
  }

  private getKnownCustomerPhones(): string[] {
    try {
      const raw = localStorage.getItem(this.knownUsersStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }

  private rememberCustomer(phone: string, name: string): void {
    if (!/^[0-9]{10}$/.test(phone)) return;
    const phones = this.getKnownCustomerPhones();
    if (!phones.includes(phone)) {
      phones.push(phone);
      localStorage.setItem(this.knownUsersStorageKey, JSON.stringify(phones));
    }
    if (name.trim()) {
      localStorage.setItem(this.customerNameKey(phone), name.trim());
    }
  }
}

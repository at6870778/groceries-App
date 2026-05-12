# Order Kro Customer App - Play Store Release Checklist

## ✅ What's Been Completed

### 1. Production Build Setup
- [x] Created `environment.prod.ts` with production API URL: `https://api.orderkro.in/api`
- [x] Updated `angular.json` for production build configuration
- [x] Built optimized production bundle (1.19 MB)
- [x] Synced with Capacitor Android project
- [x] Created `ionic.config.json` for Ionic CLI recognition

### 2. Signing Configuration
- [x] Generated signing keystore: `khanago-customer-key.jks`
- [x] Keystore password stored locally (not in git)
- [x] Configured Android release signing in `build.gradle`
- [x] Keystore valid for 10,000 days (27 years)

### 3. Documentation
- [x] Created complete `PLAY_STORE_RELEASE_GUIDE.md`
- [x] Created `PRIVACY_POLICY.md` (ready to host at https://orderkro.in/privacy)
- [x] Created `TERMS_OF_SERVICE.md` (ready to host at https://orderkro.in/terms)

### 4. App Configuration
- [x] Package name: `com.khanago.customer`
- [x] App version: 1.0 (versionCode: 1)
- [x] Backend API: `https://api.orderkro.in/api`
- [x] Android min SDK: As per Gradle config
- [x] Capacitor config: HTTPS scheme enabled

---

## ⏳ What You Need To Do Now

### Phase 1: Get APK/AAB Built (URGENT)
**Choose ONE method**:

#### Option A: Capacitor Cloud Build (Recommended - No local setup needed)
```
1. Go to https://capacitor.ionicframework.com/
2. Create account
3. Connect your GitHub repository
4. Trigger cloud build
5. Download signed APK/AAB
```

#### Option B: GitHub Actions (Automated - Takes 10 min to setup)
```
1. Create .github/workflows/android-build.yml in your repo (see PLAY_STORE_RELEASE_GUIDE.md)
2. Push to GitHub
3. GitHub automatically builds
4. Download APK from artifacts
5. Repeat for each release
```

#### Option C: Use a Mac/Linux Machine Locally
```
cd ionic-app
npm run build -- --configuration production
npx cap sync android
cd android
./gradlew bundleRelease
# APK/AAB in app/release/
```

**⚠️ CRITICAL**: You MUST have the APK/AAB before proceeding to Play Console!

---

### Phase 2: Set Up Google Play Console

**Step 1**: Create account at https://play.google.com/console ($25 one-time fee)

**Step 2**: Create new application
- App name: "Order Kro"
- Package: com.khanago.customer
- Category: Shopping/Food Delivery
- Free/Paid: Free

**Step 3**: Fill Store Listing (copy/paste from guide)
- Short description: "Fast grocery delivery. Order fresh groceries online!"
- Full description: (in PLAY_STORE_RELEASE_GUIDE.md)
- Screenshots: Take 5 screenshots of your app and upload (1080×1920 px)
- Feature graphic: Create banner image (1024×500 px)
- App icon: High-quality icon (512×512 px)

**Step 4**: Add Policy URLs
- Privacy: https://orderkro.in/privacy
- Terms: https://orderkro.in/terms

**Step 5**: Complete Content Rating
- Answer questionnaire → Get rating (usually 3+)

**Step 6**: Set Pricing to Free

---

### Phase 3: Host Required Pages

**Create these on https://orderkro.in/**:

1. **Privacy Policy**
   - URL: https://orderkro.in/privacy
   - Content: Copy from `PRIVACY_POLICY.md`

2. **Terms of Service**
   - URL: https://orderkro.in/terms
   - Content: Copy from `TERMS_OF_SERVICE.md`

3. **Support Email**
   - Ensure `support@orderkro.in` is working
   - Or update email in documentation

---

### Phase 4: Upload APK/AAB to Play Console

**In Play Console:**
1. Go to Release → Production
2. Click "Create new release"
3. Upload your APK or AAB file
4. Review signing certificate
5. Add release notes: "v1.0 - Initial Release"
6. Set rollout: Start with 10%, monitor crashes
7. Click "Review release"
8. Click "Send for review"

---

### Phase 5: Prepare Screenshots & Assets

Take screenshots on Android phone or emulator:

1. **Home Screen**: Show featured products
2. **Browse Products**: Show category/search
3. **Cart & Checkout**: Show order summary
4. **Order Tracking**: Show live delivery tracking
5. **Order Confirmation**: Show successful delivery

**Requirements**:
- Size: 1080×1920 px
- Format: PNG or JPG
- Minimum 2, maximum 8 (recommend 5)

---

## 📋 Detailed Timeline

| Task | Est. Time | Status |
|------|-----------|--------|
| Get APK/AAB built | 30 min - 2 hours | ⏳ PENDING |
| Create Play Console account | 15 min | ⏳ TODO |
| Fill store listing | 1-2 hours | ⏳ TODO |
| Create screenshots | 30 min | ⏳ TODO |
| Host privacy/terms pages | 30 min | ⏳ TODO |
| Upload APK to Play Console | 5 min | ⏳ TODO |
| Submit for review | 2 min | ⏳ TODO |
| App review (Google) | 2-24 hours | ⏳ WAIT |
| **TOTAL** | **2-3 hours + review** | |

---

## 🔑 Key Information To Keep Safe

**NEVER commit these to GitHub or share publicly**:

```
Signing Keystore Password: <your private value>
Keystore File: ionic-app/android/khanago-customer-key.jks
Store this securely for future app updates!
```

---

## 🚀 Step-by-Step Quick Start

```bash
# 1. Build APK (choose your method from above)
# 2. Open Play Console: https://play.google.com/console
# 3. Create app: "Order Kro" | Package: com.khanago.customer
# 4. Fill listing: Add description, screenshots, etc.
# 5. Add URLs: Privacy + Terms pages
# 6. Complete content rating
# 7. Upload APK/AAB
# 8. Submit for review
```

---

## ⚠️ Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Android SDK not found" | Use Capacitor Cloud Build or GitHub Actions |
| "Signing certificate mismatch" | Ensure using same keystore (khanago-customer-key.jks) |
| "App rejected for crashes" | Check Play Console crash reports, fix issue, increment versionCode, resubmit |
| "API connection fails" | Verify `environment.prod.ts` has `https://api.orderkro.in/api` |
| "App stuck in review" | Contact Google Play Support, check rejection reasons |
| "Version code not incremented" | For updates, increment versionCode in build.gradle by 1 |

---

## 📞 Support Resources

- **Ionic Docs**: https://ionicframework.com/docs
- **Capacitor Docs**: https://capacitorjs.com/docs
- **Play Store Help**: https://support.google.com/googleplay
- **Android Dev Docs**: https://developer.android.com/
- **Your Backend API**: https://api.orderkro.in/api/health (should return {"status":"UP"})

---

## 🎯 Next Immediate Action

**CRITICAL**: You need to get the APK/AAB built FIRST.

**Recommended**:
1. Go to https://capacitor.ionicframework.com/
2. Create free account
3. Connect GitHub
4. Trigger cloud build
5. Come back with APK file

Once you have the APK, message me and we'll complete Play Console setup!

---

**Files created/updated**:
- [PLAY_STORE_RELEASE_GUIDE.md](PLAY_STORE_RELEASE_GUIDE.md) - Complete guide
- [PRIVACY_POLICY.md](PRIVACY_POLICY.md) - Ready to host
- [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md) - Ready to host
- `ionic-app/src/environments/environment.prod.ts` - Production config
- `ionic-app/android/khanago-customer-key.jks` - Signing key (KEEP SAFE)
- `ionic-app/android/app/build.gradle` - Updated with signing config

---

**Last updated**: May 10, 2026 | **Status**: Ready for APK build

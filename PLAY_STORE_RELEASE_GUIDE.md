# Play Store Release Guide for Order Kro Customer App

## 📋 App Details
- **Package Name**: com.khanago.customer
- **App Name**: Order Kro
- **Version**: 1.0.0 (v1)
- **API URL**: https://api.orderkro.in/api
- **Signing Key**: khanago-customer-key.jks (stored in ionic-app/android/)
- **Signing Key Password**: Use your private value from local secure storage only

## 🔨 Build Generation (Choose Your Method)

### Option 1: Using Capacitor Cloud Build (RECOMMENDED - No local setup needed)
1. Create account at https://capacitor.ionicframework.com/
2. Connect GitHub repository
3. Trigger cloud build from dashboard
4. Download signed APK/AAB

### Option 2: GitHub Actions CI/CD (Automated)
Create `.github/workflows/android-build.yml` in your repository with:
```yaml
name: Build Android Release

on:
  push:
    branches: [main]
    paths:
      - 'ionic-app/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      - name: Build signed APK
        run: |
          cd ionic-app
          npm install
          npm run build -- --configuration production
          npx cap sync android
          cd android
          ./gradlew assembleRelease
```

### Option 3: Local Build (Requires Android SDK)
```bash
cd ionic-app
npm run build -- --configuration production
npx cap sync android
cd android
./gradlew bundleRelease  # For AAB (Google Play preferred)
# or
./gradlew assembleRelease  # For APK
```

**Output files will be at**:
- APK: `android/app/release/app-release.apk`
- AAB: `android/app/release/app-release.aab`

---

## 📱 Google Play Console Setup

### Step 1: Create Play Console Account
1. Go to https://play.google.com/console
2. Sign up for Google Play Developer account
3. Complete business details and accept terms
4. **One-time setup fee**: $25 USD

### Step 2: Create Application Listing

1. **Click "Create app"**
   - **App name**: Order Kro
   - **Default language**: English
   - **App or game**: App
   - **Free or paid**: Free
   - Check all 4 declarations

2. **App access**:
   - Select: "Full app functionality"
   - No special access needed

3. **Ads**:
   - Select: "Yes, my app contains ads" (if using ad monetization)
   - Or "No" if not monetized

---

## 📝 Store Listing (Required for Approval)

### Mandatory Fields:

**1. Short description** (80 characters max)
```
Fast grocery delivery. Order fresh groceries online!
```

**2. Full description** (4000 characters max)
```
Order Kro - Your Fast Grocery Delivery Solution

Get fresh groceries delivered to your doorstep in minutes!

Features:
• Browse fresh produce, dairy, and essentials
• Real-time order tracking
• Fast delivery from local vendors
• Secure payment options
• Track delivery with live GPS
• Order history and saved preferences

Download now and get fresh groceries delivered!

Terms of Service: https://orderkro.in/terms
Privacy Policy: https://orderkro.in/privacy
Contact: support@orderkro.in
```

**3. Screenshots** (Must have 2-8, recommended 5)
Save these as PNG/JPG files:
- Screenshot 1: Home screen with products
- Screenshot 2: Product browsing
- Screenshot 3: Cart & checkout
- Screenshot 4: Order tracking
- Screenshot 5: Delivery confirmation

**Specifications**:
- Size: 1080×1920 px (portrait)
- Min: 1080×1440 px
- Max: 1440×2960 px
- Format: 24-bit PNG or JPEG

**4. Feature Graphic** (1024×500 px)
A banner image showing app highlights

**5. App Icon** (512×512 px, PNG)
High-quality icon for app representation

---

## 🔗 Required Pages (Create on https://orderkro.in/)

### 1. Privacy Policy
**URL**: `https://orderkro.in/privacy`

Create file: `privacy-policy.md`
```markdown
# Privacy Policy

## Data Collection
We collect:
- Phone number (for delivery)
- Delivery address
- Order history
- Payment information (tokenized)

## Data Usage
- Order fulfillment
- Delivery coordination
- Service improvements
- Optional: Marketing communications

## Data Protection
- Data encrypted in transit (HTTPS)
- Stored securely with access controls
- No third-party sharing without consent

## User Rights
- Access your data: support@orderkro.in
- Delete account request: support@orderkro.in
- Manage preferences in app settings

## Contact
Email: support@orderkro.in
Last updated: May 10, 2026
```

### 2. Terms of Service
**URL**: `https://orderkro.in/terms`

```markdown
# Terms of Service

## Acceptance
By using Order Kro, you accept these terms.

## User Responsibility
- You must be 18+ to use this service
- Accurate delivery address required
- Payment method must be authorized

## Service Limitation
- We deliver within service areas only
- Delivery times are estimates only
- We reserve right to cancel orders

## Liability
Order Kro is provided "as is" without warranties.
We're not liable for delivery delays or product issues beyond our control.

## Contact
support@orderkro.in
```

### 3. Support Email
Create: `support@orderkro.in` or use existing support channel

---

## 📋 Content Rating Questionnaire

**In Play Console**, complete questionnaire:

1. **Violence**: No
2. **Sexual Content**: No
3. **Profanity**: No
4. **Alcohol/Tobacco/Drugs**: No (unless selling alcohol)
5. **Gambling**: No
6. **Mature Themes**: No
7. **Ads or In-App Purchases**: Your choice
8. **Location Services**: Yes (for delivery tracking)

→ This generates content rating (typically 3+)

---

## 🔐 Signing & Release

### Step 1: Upload Release Bundle
1. **In Play Console > YourApp > Release > Production**
2. **Click "Create new release"**
3. **Upload signed APK or AAB**:
   - Google prefers AAB format
   - File size typically 50-100MB
4. **Review signing certificate fingerprint**
5. **It should match**:
   ```
   keytool -list -v -keystore khanago-customer-key.jks
   ```

### Step 2: Release Notes
Add version notes:
```
v1.0.0 - Initial Release
- Browse and order groceries
- Real-time delivery tracking
- Secure payment
```

### Step 3: Set Rollout Percentage
- First time: Start with 10-20% rollout
- Monitor crash logs
- Gradually increase to 100%

---

## ✅ Pre-Launch Checklist

Before submitting:
- [ ] APK/AAB file ready (signed and tested)
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars max)
- [ ] 5 screenshots (1080×1920 px)
- [ ] Feature graphic (1024×500 px)
- [ ] App icon (512×512 px)
- [ ] Privacy policy URL working
- [ ] Terms of service URL working
- [ ] Content rating completed
- [ ] Pricing set to Free
- [ ] Default language set to English
- [ ] Contact email added

---

## 📊 Review Process

1. **Submission**: Click "Send for review"
2. **Review time**: 2-4 hours to 2 days typically
3. **Automated checks**: Malware, performance, crashes
4. **Manual review**: Policy compliance
5. **Approval**: App appears on Play Store
6. **Rejection**: Get detailed rejection reasons
   - Fix and resubmit immediately
   - Typical issues: crash on startup, policy violations, sensitive permissions

---

## 🚀 After Launch

### Monitor Performance:
- Play Console > Your app > Metrics
- Crashes & ANRs tab
- Ratings & reviews tab
- Install data tab

### Rollout Strategy:
- Week 1: 10% rollout (monitor stability)
- Week 2: 50% rollout (after stabilization)
- Week 3: 100% rollout (full release)

### Handling Crashes:
If crash rate > 1%:
1. Click on crash report
2. Get stack trace
3. Fix in code
4. Build new version (increment versionCode)
5. Submit as update

---

## 📞 Support & Troubleshooting

**Common Issues**:

| Issue | Solution |
|-------|----------|
| APK signing failed | Verify keystore path and passwords |
| Low rating in review | Check for crashes, test on Android 8+ |
| Binary rejected for policy | Review data permissions and ad implementation |
| Can't upload to internal testing | Check app icon, signing certificate |

**Resources**:
- Play Store Developer Help: https://support.google.com/googleplay/
- Capacitor Docs: https://capacitorjs.com/docs/guides/deploying-updates
- Android Developers: https://developer.android.com/

---

## 🔄 Version Updates

For app updates:

1. **Update version in** `android/app/build.gradle`:
```gradle
versionCode 2  // Increment by 1
versionName "1.0.1"  // Semantic versioning
```

2. **Build new signed APK/AAB**

3. **In Play Console > Create new release**:
   - Upload new APK/AAB
   - Add what's new notes
   - Set rollout percentage
   - Submit

4. **Update backend if needed** (no app restart needed for configuration)

---

## 📅 Timeline Estimate

| Task | Duration |
|------|----------|
| Prepare screenshots & copy | 1-2 hours |
| Create Play Store account | 15 minutes |
| Fill store listing | 30 minutes |
| Create privacy policy page | 15 minutes |
| Complete content rating | 10 minutes |
| Upload APK/AAB | 5 minutes |
| Initial review | 2-24 hours |
| Fix issues (if any) | 30 minutes |
| Full release | 30 minutes |
| **Total** | **2-3 hours + review time** |

---

## 🎯 Next Steps

1. ✅ **Build the APK/AAB** (using one of the methods above)
2. ⏳ Create Play Console account
3. ⏳ Set up app store listing
4. ⏳ Create privacy policy page
5. ⏳ Upload signed APK/AAB
6. ⏳ Submit for review
7. ⏳ Monitor and publish

**Once APK is ready, let me know and I'll help with Play Console setup!**

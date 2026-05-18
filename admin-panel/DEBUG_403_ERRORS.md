# 403 Forbidden Errors - Root Cause & Solutions

## 🎯 The Problem

Your admin-panel is receiving **403 Forbidden** errors on all admin API calls. The flow is:

```
Browser Request
    ↓
Angular AuthInterceptor (adds Authorization: Bearer token)
    ↓
Backend JwtAuthFilter (validates JWT token)
    ↓
SecurityConfig.hasRole("ADMIN") check
    ↓
❌ 403 if user lacks ADMIN role
```

---

## 🔍 Root Causes (In Order of Likelihood)

### 1. **Primary Issue: Missing ADMIN Role Assignment** ⚠️
The user authenticated successfully, but **no ADMIN role was assigned** during OTP verification.

**What happens:**
- ✅ Token is valid (not expired)
- ✅ User exists in database
- ❌ `user_roles` table has NO entry for this user with ROLE_ADMIN
- ❌ JwtAuthFilter cannot include `ROLE_ADMIN` in token
- ❌ SecurityConfig rejects all `/api/admin/**` requests

**How to fix:**
```sql
-- Check if admin user has the ADMIN role assigned
SELECT ur.* FROM user_roles ur 
WHERE ur.user_id = <your_user_id> AND ur.role_id = (SELECT id FROM roles WHERE name='ADMIN');

-- If empty, assign the role:
INSERT INTO user_roles (user_id, role_id) 
VALUES (<your_user_id>, (SELECT id FROM roles WHERE name='ADMIN'));
```

---

### 2. **Token Expired or Invalid**
Even though `AuthService.loadValidToken()` checks expiration, there could be issues:

**Debug:**
```typescript
// In browser console, check token claims:
const token = localStorage.getItem('admin_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token exp:', new Date(payload.exp * 1000));
console.log('Token roles:', payload.roles);
console.log('Current time:', new Date());
```

**Expected output if valid:**
```
Token exp: Date (future date)
Token roles: ['ROLE_ADMIN']
```

**If `roles` array is empty or missing ROLE_ADMIN:** This confirms the backend issue.

---

### 3. **CORS Issue** (Less Likely - Would show different error)
If requests were blocked by CORS, you'd see a different error in console. But verify:

**Check browser console:**
- ✅ No "CORS policy" messages
- ✅ Network tab shows request being sent (not preflight blocked)

---

## 🛠️ Step-by-Step Debugging

### Step 1: Check Your Token
```typescript
// Open browser DevTools (F12) → Console, paste:
const token = localStorage.getItem('admin_token');
if (!token) {
  console.log('❌ No token found - you are NOT logged in');
} else {
  const [header, payload, signature] = token.split('.');
  const decoded = JSON.parse(atob(payload));
  console.log('Token Payload:', decoded);
  console.log('Roles:', decoded.roles || decoded.authorities);
  console.log('Expires:', new Date(decoded.exp * 1000));
  console.log('Is Valid:', decoded.exp * 1000 > Date.now());
}
```

### Step 2: Check Backend Database
```sql
-- Connect to your backend database
-- 1. Find your user ID
SELECT id, phone FROM users WHERE phone='<your_phone>';

-- 2. Check what roles are assigned
SELECT r.name FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = <user_id>;

-- 3. Check all available roles
SELECT id, name FROM roles;
```

### Step 3: Add Network Request Logging
Edit [admin-panel/src/app/core/interceptors/auth.interceptor.ts](admin-panel/src/app/core/interceptors/auth.interceptor.ts):

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/auth/request-otp') || req.url.includes('/auth/verify-otp')) {
    return next(req);
  }

  const token = localStorage.getItem('admin_token');
  const router = inject(Router);

  console.log('[AUTH] Request to:', req.url);
  console.log('[AUTH] Token present:', !!token);
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('[AUTH] Token roles:', payload.roles);
  }

  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((err) => {
      console.error('[AUTH] Request failed:', err.status, err.error);
      if (err.status === 401) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_roles');
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};
```

### Step 4: Check OTP Verification Response
In [admin-panel/src/app](admin-panel/src/app) components, add logging when verifying OTP:

```typescript
// In your login component
this.authService.login(phone, fullName, otp, reqId).subscribe({
  next: (response) => {
    console.log('✅ Login Response:', response);
    console.log('Roles in response:', response.data.roles);
    console.log('Token:', response.data.token);
    this.authService.saveSession(response.data);
  },
  error: (err) => {
    console.error('❌ Login Error:', err);
  }
});
```

---

## 📊 Common Scenarios

| Scenario | Token | Roles | Result |
|----------|-------|-------|--------|
| ✅ Normal (works) | Valid | `['ROLE_ADMIN']` | 200 OK |
| ❌ Missing role | Valid | `[]` or no roles | 403 Forbidden |
| ❌ Expired token | Expired | Any | 401 Unauthorized |
| ❌ No token | N/A | N/A | 401 or 403 |

---

## 🔧 Solutions

### Solution 1: Assign ADMIN Role in Database
```sql
-- After verifying your user_id (from Step 2 above)
BEGIN;
INSERT INTO user_roles (user_id, role_id) 
VALUES (
  <your_user_id>, 
  (SELECT id FROM roles WHERE name='ADMIN')
);
COMMIT;

-- Verify
SELECT r.name FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = <your_user_id>;
```

Then:
1. **Log out** from admin-panel (`/logout`)
2. **Clear localStorage**: Open DevTools → Application → Local Storage → Clear admin_token
3. **Log back in** with OTP verification
4. New token should include ROLE_ADMIN

### Solution 2: Fix Backend OTP Verification (If role not assigned automatically)
Check [backend/src/main/java/.../.../OtpController.java](backend/src/main) to ensure role is assigned when `role: 'ADMIN'` is passed in request.

The client is sending:
```json
{
  "phone": "...",
  "otp": "...",
  "role": "ADMIN"
}
```

Backend should:
1. Create user if new
2. Assign the requested role from `user_roles` table
3. Generate JWT with that role

---

## ✅ How to Verify Fix

Once you've assigned the ADMIN role:

1. **Open DevTools** (F12)
2. **Go to Console tab**
3. **Paste:**
```javascript
const token = localStorage.getItem('admin_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Roles:', payload.roles);
```

4. **Expected output:**
```
Roles: ['ROLE_ADMIN']
```

5. **Refresh page** - API calls should now return **200 OK** instead of 403

---

## 📝 Files Involved

| File | Purpose |
|------|---------|
| [admin-panel/src/app/core/interceptors/auth.interceptor.ts](admin-panel/src/app/core/interceptors/auth.interceptor.ts) | Adds JWT token to requests |
| [admin-panel/src/app/core/services/auth.service.ts](admin-panel/src/app/core/services/auth.service.ts) | Manages token storage & validation |
| [admin-panel/src/environments/environment.ts](admin-panel/src/environments/environment.ts) | API URL configuration |
| Backend: `SecurityConfig` | Path-level auth: `.hasRole("ADMIN")` |
| Backend: `JwtAuthFilter` | Extracts & validates JWT token |
| Backend: `user_roles` table | Many-to-many role assignment |

---

## 🎓 Key Takeaway

**403 Forbidden ≠ Authentication Failed**
- **401 Unauthorized** = No token or invalid token (authentication)
- **403 Forbidden** = Valid token but insufficient permissions (authorization)

Your situation: You're authenticated but not authorized for `/api/admin/**` endpoints because your user account lacks the ADMIN role.


# Spring Boot Backend - Admin Dashboard API Security Analysis

## Executive Summary
The backend uses Spring Security 6 with JWT-based authentication. Admin endpoints require an `ADMIN` role. A 403 Forbidden error typically indicates the user lacks the required `ADMIN` role in their JWT token, even if authenticated.

---

## 1. Admin Dashboard API Endpoint Analysis

### Endpoint Definition
**File**: [admin/controller/AdminController.java](admin/controller/AdminController.java)
- **URL**: `/api/admin/**`
- **Base Path**: `/api/admin`
- **Endpoints**:
  - `GET /api/admin/dashboard` → Returns `DashboardDto`
  - `GET /api/admin/customers` → Paginated customer list
  - `GET /api/admin/delivery-boys` → Paginated delivery boys list
  - `GET /api/admin/reports` → Summary reports
  - `GET /api/admin/reports/daily` → Daily order reports
  - `POST /api/admin/customers` → Create customer
  - `POST /api/admin/delivery-boys` → Create delivery boy
  - `PATCH /api/admin/users/{userId}/active` → Update user active status

### Key Observation
**No additional authorization annotations** like `@Secured` or `@PreAuthorize` on individual methods. All authorization is handled at the **path level** in `SecurityConfig`.

---

## 2. Authentication & Authorization Flow

### 2.1 Security Configuration
**File**: `security/SecurityConfig.java`

#### Request Authorization Rules
```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    .requestMatchers(HttpMethod.POST, "/api/auth/request-otp", "/api/auth/verify-otp", "/api/auth/refresh").permitAll()
    .requestMatchers("/api/auth/**", "/api/health", "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/catalog/**").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
    .requestMatchers("/api/admin/**").hasRole("ADMIN")  // ⚠️ ADMIN endpoints require ADMIN role
    .requestMatchers("/api/delivery/**").hasAnyRole("DELIVERY_BOY", "ADMIN")
    .requestMatchers("/api/customer/**").hasAnyRole("CUSTOMER", "ADMIN")
    .anyRequest().authenticated()
)
```

#### Critical Point
- `/api/admin/**` paths **require** `hasRole("ADMIN")`
- This is enforced **before** the controller methods are invoked
- If a user lacks the ADMIN role → **403 Forbidden**

### 2.2 JWT Authentication Filter
**File**: `security/JwtAuthFilter.java`

#### Flow
1. Extracts `Authorization: Bearer <token>` header
2. Parses JWT token using `JwtService`
3. Loads user details from database using `CustomUserDetailsService`
4. Sets `SecurityContext` with user's authorities (roles)
5. If token is invalid or expired → **skips authentication** (not 403, just unauthenticated)

```java
@Override
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) {
    final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
        filterChain.doFilter(request, response);
        return;  // Continues without auth
    }

    String token = authHeader.substring(7);
    String username = jwtService.extractUsername(token);  // May throw exception
    
    if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        if (jwtService.isTokenValid(token, userDetails)) {
            // Sets SecurityContext with user's authorities
            UsernamePasswordAuthenticationToken authToken = 
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authToken);
        }
    }
    
    filterChain.doFilter(request, response);
}
```

### 2.3 User Authorities Resolution
**File**: `security/CustomUserDetailsService.java`

```java
@Override
public UserDetails loadUserByUsername(String phone) throws UsernameNotFoundException {
    User user = userRepository.findByPhone(phone)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));

    return new AuthenticatedUser(
            user.getId(),
            user.getPhone(),
            user.getPasswordHash(),
            user.getRoles().stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName().name()))
                    .collect(Collectors.toSet())
    );
}
```

#### Role Mapping
- User roles are fetched from database (many-to-many relationship: `user_roles` join table)
- Each `Role` has a `RoleName` enum value (`CUSTOMER`, `ADMIN`, `DELIVERY_BOY`)
- Converted to Spring Security format: `ROLE_<ENUM_NAME>`
  - `ADMIN` → `ROLE_ADMIN`
  - `CUSTOMER` → `ROLE_CUSTOMER`
  - `DELIVERY_BOY` → `ROLE_DELIVERY_BOY`

---

## 3. ADMIN Role Validation

### 3.1 Database Level
**Files**: `user/User.java`, `user/Role.java`

```java
@ManyToMany(fetch = FetchType.EAGER)
@JoinTable(
    name = "user_roles",
    joinColumns = @JoinColumn(name = "user_id"),
    inverseJoinColumns = @JoinColumn(name = "role_id")
)
private Set<Role> roles = new HashSet<>();
```

**Role Entity**:
```java
@Entity
@Table(name = "roles")
public class Role extends BaseAuditEntity {
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 30)
    private RoleName name;  // ADMIN, CUSTOMER, DELIVERY_BOY
}
```

### 3.2 Runtime Authorization Check
**File**: `security/SecurityUtils.java`

```java
public static boolean hasRole(String roleName) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null) {
        return false;
    }
    String normalized = roleName.toUpperCase(Locale.ROOT);
    String springRole = "ROLE_" + normalized;
    return authentication.getAuthorities().stream()
            .anyMatch(a -> springRole.equals(a.getAuthority()));
}
```

### 3.3 Usage Examples
**File**: `delivery/service/DeliveryService.java`

```java
boolean isAdmin = SecurityUtils.hasRole("ADMIN");
List<DeliveryAssignment> assignments = isAdmin
    ? assignmentRepository.findByStatusIn(activeStatuses)
    : assignmentRepository.findByDeliveryBoyIdAndStatusIn(deliveryBoyId, activeStatuses);
```

---

## 4. JWT Token Validation & Parsing

### 4.1 JWT Service
**File**: `security/JwtService.java`
- **Library**: JJWT 0.12.6 (JJWT API + Impl + Jackson)
- **Algorithm**: HMAC SHA

#### Token Generation
```java
public String generateToken(AuthenticatedUser user) {
    Instant now = Instant.now();
    Instant expiry = now.plusSeconds(appProperties.getJwt().getExpiryMinutes() * 60);

    List<String> roles = user.getAuthorities().stream()
        .map(GrantedAuthority::getAuthority).toList();

    return Jwts.builder()
            .subject(user.getUsername())  // Phone number
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .claims(Map.of("uid", user.id(), "roles", roles))  // ⚠️ Contains roles
            .signWith(secretKey)
            .compact();
}
```

#### Token Validation
```java
public boolean isTokenValid(String token, UserDetails userDetails) {
    String username = extractUsername(token);
    return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
}

private boolean isTokenExpired(String token) {
    return extractAllClaims(token).getExpiration().before(new Date());
}

private Claims extractAllClaims(String token) {
    return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
}
```

### 4.2 JWT Configuration
**File**: `application.yml`

```yaml
app:
  jwt:
    secret: ${JWT_SECRET:change-me-to-a-long-random-string-of-at-least-32-bytes}
    expiry-minutes: ${JWT_EXPIRY_MINUTES:1440}  # 24 hours
    refresh-expiry-days: ${JWT_REFRESH_EXPIRY_DAYS:30}
```

#### Token Lifecycle
1. **Access Token**: Expires in 1440 minutes (24 hours by default)
2. **Refresh Token**: Expires in 30 days
3. **Secret Key**: HMAC-SHA key derived from configuration

---

## 5. CORS Configuration

### 5.1 CORS Configuration
**File**: `security/SecurityConfig.java`

```java
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    String allowedOrigins = appProperties.getCors().getAllowedOrigins();
    
    if (allowedOrigins != null && !allowedOrigins.trim().isEmpty()) {
        config.setAllowedOriginPatterns(Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .toList());
    } else {
        config.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:*", "http://127.0.0.1:*",
            "https://orderkro.in", "https://www.orderkro.in",
            "https://admin.orderkro.in", "https://api.orderkro.in",
            "http://72.61.170.111:*"
        ));
    }
    
    config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

### 5.2 Configuration Properties
**File**: `config/AppProperties.java`

```yaml
app:
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:*,http://127.0.0.1:*,http://localhost:4200,http://localhost:8100,http://localhost:65477}
```

#### CORS Rules
- **Allowed Origins**: Configurable via environment variable or defaults to localhost + production domains
- **Allowed Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Allowed Headers**: Authorization, Content-Type, Accept, Origin, X-Requested-With
- **Credentials**: `true` (cookies/auth headers are allowed)
- **Preflight**: OPTIONS requests are always allowed

---

## 6. What Causes 403 Forbidden Errors?

### 6.1 Primary Cause: Missing ADMIN Role
When a user accesses `/api/admin/**` endpoints **without** an `ADMIN` role in their JWT token:

```
403 Forbidden
Access Denied: User does not have the required ADMIN role
```

**Why it happens**:
1. User authenticates successfully with valid JWT
2. User's JWT is parsed → authorities populated in SecurityContext
3. User's database record doesn't have the ADMIN role assigned
4. Authorization check fails → **403**

### 6.2 Secondary Causes

#### Scenario A: Token Doesn't Contain Role Information
- JWT token is valid but roles were not properly encoded
- User details service couldn't load user from database
- Result: User has NO authorities → **403**

#### Scenario B: User Deactivated
- User exists but `is_active = false`
- **Current code doesn't explicitly check this**, but could be enforced in service layer

#### Scenario C: CORS Policy Violation (Browser Only)
- Request from disallowed origin
- Browser blocks request → **CORS Error** (different from 403)
- Server never processes the request

### 6.3 Secondary Causes: User Verification Failures

**File**: `auth/service/OtpAuthService.java` - verifyOtp() method

```java
// Check if user has required role (for non-CUSTOMER roles)
if (roleName != RoleName.CUSTOMER && !acceptAnyOtp) {
    User existing = userRepository.findByPhone(phone).orElseGet(() -> {
        writeAuditLog(phone, "VERIFY_ROLE_DENIED", clientIp,
                "Login attempt for unregistered " + roleName + " phone");
        throw new ApiException("Access denied. Contact your administrator.");
    });
    boolean hasRole = existing.getRoles().stream()
            .anyMatch(r -> r.getName() == roleName);
    if (!hasRole) {
        writeAuditLog(phone, "VERIFY_ROLE_MISMATCH", clientIp,
                "Phone " + phone + " does not have role " + roleName);
        throw new ApiException("Access denied. Contact your administrator.");
    }
}
```

**What this checks**:
- User attempting to login as `ADMIN` or `DELIVERY_BOY`
- User must exist in database
- User must have that role assigned
- Prevents unauthorized role assumption via OTP

---

## 7. How Admin Requests Should Work

### 7.1 Successful Admin Request Flow

```
1. Admin user logs in via OTP
   POST /api/auth/verify-otp
   - Phone: admin phone
   - OTP: valid
   - roleName: "ADMIN"
   ↓
   
2. OtpAuthService checks:
   - User exists in database
   - User has ADMIN role in user_roles join table
   ↓
   
3. JWT token generated with:
   - subject: "admin_phone"
   - claims: { uid: <user_id>, roles: ["ROLE_ADMIN"] }
   - signed with secret key
   ↓
   
4. Admin makes API request:
   GET /api/admin/dashboard
   Header: Authorization: Bearer <token>
   ↓
   
5. JwtAuthFilter processes:
   - Extracts token
   - Parses JWT → validates signature & expiry
   - Loads user details from database
   - Populates SecurityContext with authorities: [ROLE_ADMIN]
   ↓
   
6. SecurityConfig authorization:
   - requestMatchers("/api/admin/**").hasRole("ADMIN")
   - Check: Does SecurityContext have "ROLE_ADMIN"? ✓ YES
   ↓
   
7. Request proceeds to AdminController
   - getDashboard() executes successfully
   ↓
   
8. Response: 200 OK with DashboardDto
```

### 7.2 Failed Admin Request (403 Scenario)

```
Scenario: Non-admin user tries to access admin endpoint

1. Regular CUSTOMER user logs in
   → JWT contains: roles: ["ROLE_CUSTOMER"]
   ↓
   
2. CUSTOMER makes request:
   GET /api/admin/dashboard
   Header: Authorization: Bearer <customer_token>
   ↓
   
3. JwtAuthFilter processes:
   - Extracts and validates token ✓
   - Loads user from database ✓
   - Populates SecurityContext with: [ROLE_CUSTOMER]
   ↓
   
4. SecurityConfig authorization:
   - requestMatchers("/api/admin/**").hasRole("ADMIN")
   - Check: Does SecurityContext have "ROLE_ADMIN"? ✗ NO
   - hasRole("ADMIN") fails
   ↓
   
5. AccessDeniedException thrown
   ↓
   
6. Response: 403 Forbidden
   "Access Denied: User does not have [ADMIN] role"
```

---

## 8. Database Schema for Role Assignment

### User-Role Relationship

```sql
-- Table: users
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    -- ...
);

-- Table: roles
CREATE TABLE roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(30) UNIQUE NOT NULL,  -- ADMIN, CUSTOMER, DELIVERY_BOY
    -- ...
);

-- Join Table
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

### Example Queries

```sql
-- Get all roles for a user
SELECT r.name 
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 1;

-- Check if user has ADMIN role
SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = 1 AND r.name = 'ADMIN'
) AS is_admin;

-- Count users by role
SELECT r.name, COUNT(ur.user_id) 
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
GROUP BY r.name;
```

---

## 9. Authentication Flow Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser/App)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 1. POST /api/auth/verify-otp
                     │    { phone, otp, roleName: "ADMIN" }
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    Spring Security                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ OtpAuthService.verifyOtp()                             │ │
│  │ ✓ Check: User exists                                  │ │
│  │ ✓ Check: User has ADMIN role in user_roles table     │ │
│  │ ✓ Generate JWT with roles: ["ROLE_ADMIN"]            │ │
│  └────────────────────────────────────────────────────────┘ │
│                     │                                        │
│                     ↓ Response: { accessToken, refreshToken } │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      │ 2. GET /api/admin/dashboard
                      │    Header: Authorization: Bearer <token>
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              JwtAuthFilter (OncePerRequestFilter)           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. Extract Authorization header                       │ │
│  │ 2. Parse JWT token                                   │ │
│  │    - Verify signature (HMAC-SHA)                     │ │
│  │    - Check expiration                                │ │
│  │ 3. Extract username (phone number)                   │ │
│  │ 4. Load UserDetails from database                    │ │
│  │ 5. Create UsernamePasswordAuthenticationToken        │ │
│  │    with authorities: [ROLE_ADMIN]                    │ │
│  │ 6. Set SecurityContextHolder                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                     │                                        │
│                     ↓                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ SecurityConfig Authorization                          │ │
│  │ requestMatchers("/api/admin/**").hasRole("ADMIN")    │ │
│  │                                                       │ │
│  │ Check: Has ROLE_ADMIN? YES ✓                         │ │
│  │ → Proceed to controller                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                     │                                        │
│                     ↓                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ AdminController.dashboard()                           │ │
│  │ → Fetch and return DashboardDto                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      │ 3. Response: 200 OK
                      │    { "totalCustomers": 100, ... }
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Key Findings Summary

| Component | Finding |
|-----------|---------|
| **Admin Endpoints** | Protected at `/api/admin/**` level with `.hasRole("ADMIN")` |
| **Authorization** | Path-level only; no method-level `@Secured` or `@PreAuthorize` annotations |
| **Role Source** | Database `user_roles` join table (eagerly fetched in User entity) |
| **JWT Roles** | Included in token claims during generation; verified on every request |
| **JWT Validation** | Token signature verified, expiration checked, username compared |
| **Token Lifespan** | Access: 24 hours (default), Refresh: 30 days |
| **CORS** | Enabled for multiple origins; allows credentials & Authorization header |
| **403 Cause** | User authenticated but lacks ADMIN role in SecurityContext |
| **Role Lookup** | Runtime: `SecurityUtils.hasRole("ADMIN")` checks `SecurityContext` |
| **Exception Handling** | GlobalExceptionHandler returns standard ApiErrorResponse |
| **Entry Point** | Default Spring Security entry point (no custom handler defined) |

---

## 11. Recommendations for Debugging 403 Errors

### Quick Diagnostics

1. **Verify token contains ADMIN role**:
   ```bash
   # Decode JWT at jwt.io
   # Check claims: { "uid": <id>, "roles": ["ROLE_ADMIN"] }
   ```

2. **Check database user_roles table**:
   ```sql
   SELECT u.phone, r.name 
   FROM users u
   LEFT JOIN user_roles ur ON u.id = ur.user_id
   LEFT JOIN roles r ON ur.role_id = r.id
   WHERE u.phone = '<admin_phone>';
   ```

3. **Verify OTP verification logic**:
   - Ensure `roleName` parameter is correctly set to `"ADMIN"`
   - Check that `verifyOtp()` doesn't reject non-registered admins

4. **Test with Swagger UI**:
   - Access: `http://localhost:8080/swagger-ui.html`
   - Generate token via auth endpoint
   - Test admin endpoint with token
   - Check response headers for CORS issues

5. **Enable debug logging**:
   ```yaml
   logging:
     level:
       org.springframework.security: DEBUG
       com.khanago.grocery: DEBUG
   ```

### Common Causes & Solutions

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| 403 on admin endpoint | User missing ADMIN role in DB | Add user to role via admin panel or DB insert |
| 403 with valid ADMIN role | Token not refreshed | Generate new token; old token may be stale |
| CORS error (browser) | Origin not in allowed list | Add origin to `CORS_ALLOWED_ORIGINS` env var |
| Invalid token error | JWT secret mismatch | Ensure `JWT_SECRET` is same in all environments |
| Token expired | Expiration time passed | Use refresh token to get new access token |

---

## 12. File Structure Reference

```
backend/
├── src/main/java/com/khanago/grocery/
│   ├── admin/
│   │   ├── controller/AdminController.java        # Admin endpoints
│   │   └── service/AdminService.java              # Admin business logic
│   ├── auth/
│   │   └── service/OtpAuthService.java            # OTP & role verification
│   ├── security/
│   │   ├── SecurityConfig.java                    # Authorization rules
│   │   ├── JwtAuthFilter.java                     # JWT extraction & validation
│   │   ├── JwtService.java                        # Token generation & parsing
│   │   ├── CustomUserDetailsService.java          # User role loading
│   │   ├── AuthenticatedUser.java                 # UserDetails implementation
│   │   └── SecurityUtils.java                     # Runtime role checks
│   ├── user/
│   │   ├── User.java                              # User entity with roles
│   │   ├── Role.java                              # Role entity
│   │   └── RoleName.java                          # Role enum (ADMIN, CUSTOMER, DELIVERY_BOY)
│   ├── config/
│   │   └── AppProperties.java                     # Configuration properties
│   └── delivery/
│       └── service/DeliveryService.java           # Example hasRole usage
├── src/main/resources/
│   └── application.yml                            # Configuration
└── pom.xml                                        # Dependencies (JJWT, Spring Security)
```

---

## Conclusion

The backend implements a well-structured JWT + Spring Security authentication system. **403 Forbidden errors on admin endpoints are exclusively caused by users lacking the ADMIN role**, not by authentication failures or CORS issues. Ensure users are properly assigned the ADMIN role in the `user_roles` table before attempting to access protected endpoints.

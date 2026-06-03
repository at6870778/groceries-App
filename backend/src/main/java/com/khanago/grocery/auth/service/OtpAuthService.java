package com.khanago.grocery.auth.service;

import com.khanago.grocery.auth.OtpAuditLog;
import com.khanago.grocery.auth.OtpRecord;
import com.khanago.grocery.auth.RefreshToken;
import com.khanago.grocery.auth.dto.AuthResponseDto;
import com.khanago.grocery.auth.dto.OtpRequestDto;
import com.khanago.grocery.auth.dto.OtpVerifyDto;
import com.khanago.grocery.auth.dto.RefreshTokenRequestDto;
import com.khanago.grocery.auth.repository.OtpAuditLogRepository;
import com.khanago.grocery.auth.repository.OtpRecordRepository;
import com.khanago.grocery.auth.repository.RefreshTokenRepository;
import com.khanago.grocery.common.enums.RoleName;
import com.khanago.grocery.common.exception.ApiException;
import com.khanago.grocery.config.AppProperties;
import com.khanago.grocery.security.AuthenticatedUser;
import com.khanago.grocery.security.JwtService;
import com.khanago.grocery.user.Role;
import com.khanago.grocery.user.User;
import com.khanago.grocery.user.repository.RoleRepository;
import com.khanago.grocery.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpAuthService {

    // ── Constants ────────────────────────────────────────────────────────────────
    private static final int OTP_EXPIRY_MINUTES    = 5;
    private static final int MAX_VERIFY_ATTEMPTS   = 5;
    private static final int RESEND_COOLDOWN_SECS  = 30;
    private static final int RATE_WINDOW_MINUTES   = 10;
    private static final int RATE_MAX_REQUESTS     = 5;
    private static final int RATE_LOCKOUT_MINUTES  = 15;

    // ── Dependencies ─────────────────────────────────────────────────────────────
    private final UserRepository          userRepository;
    private final RoleRepository          roleRepository;
    private final PasswordEncoder         passwordEncoder;
    private final JwtService              jwtService;
    private final RefreshTokenRepository  refreshTokenRepository;
    private final AppProperties           appProperties;
    private final OtpRecordRepository     otpRecordRepository;
    private final OtpAuditLogRepository   otpAuditLogRepository;
    private final Msg91SmsService         msg91SmsService;

    private final SecureRandom secureRandom = new SecureRandom();

    // ══════════════════════════════════════════════════════════════════════════════
    //  Public API
    // ══════════════════════════════════════════════════════════════════════════════

    @Transactional
    public String requestOtp(OtpRequestDto request, String clientIp) {
        String phone = request.phone();
        boolean widgetEnabled = appProperties.getMsg91().isWidgetEnabled();

        // 1. Resend cooldown: reject if last OTP was sent within RESEND_COOLDOWN_SECS
        otpRecordRepository.findLatestByPhone(phone).ifPresent(latest -> {
            if (latest.getCreatedAt().isAfter(LocalDateTime.now().minusSeconds(RESEND_COOLDOWN_SECS))) {
                writeAuditLog(phone, "REQUEST_THROTTLED", clientIp, "Resend cooldown active");
                throw new ApiException("Please wait " + RESEND_COOLDOWN_SECS +
                        " seconds before requesting a new OTP.");
            }
        });

        // 2. Rate limit: max RATE_MAX_REQUESTS per RATE_WINDOW_MINUTES
        long recentCount = otpRecordRepository.countRequestsSince(
                phone, LocalDateTime.now().minusMinutes(RATE_WINDOW_MINUTES));
        if (recentCount >= RATE_MAX_REQUESTS) {
            writeAuditLog(phone, "REQUEST_RATE_LIMITED", clientIp,
                    recentCount + " requests in " + RATE_WINDOW_MINUTES + "-min window");
            throw new ApiException("Too many OTP requests. Please wait " +
                    RATE_LOCKOUT_MINUTES + " minutes before retrying.");
        }

        // 3. Invalidate all prior active OTPs for this phone (one-at-a-time principle)
        otpRecordRepository.invalidateAllActiveForPhone(phone);

        // 4. Generate numeric OTP upfront (needed for both widget and fallback SMS)
        String numericOtp = String.format("%06d", secureRandom.nextInt(1_000_000));
        
        // 5. Persist OTP metadata for resend/rate-limit tracking.
        OtpRecord record = new OtpRecord();
        record.setPhone(phone);
        record.setOtpHash(passwordEncoder.encode(numericOtp));
        record.setExpiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        record.setAttemptCount(0);
        record.setUsed(false);
        record.setInvalidated(false);
        otpRecordRepository.save(record);

        String requestId;
        if (widgetEnabled) {
            try {
                requestId = msg91SmsService.sendWidgetOtp(phone);
            } catch (Exception widgetException) {
                // Widget failed (credentials invalid, region not supported, etc.)
                // Fall back to regular SMS API with numeric OTP
                log.warn("MSG91 widget OTP failed for +{}, falling back to regular SMS API: {}", 
                        phone, widgetException.getMessage());
                try {
                    msg91SmsService.sendOtp(phone, numericOtp);
                    requestId = "FALLBACK-API-OTP";
                } catch (Exception apiException) {
                    log.error("Both widget and regular SMS API failed for +{}", phone);
                    throw new ApiException("Unable to send OTP. Both delivery methods failed. Please try again.");
                }
            }
        } else {
            msg91SmsService.sendOtp(phone, placeholderOtp);
            requestId = "LOCAL-OTP";
        }

        writeAuditLog(phone, "REQUEST_SUCCESS", clientIp, "OTP dispatched");
        return requestId;
    }

    @Transactional
    public String retryOtp(String phone, String reqId, String clientIp) {
        if (reqId == null || reqId.isBlank()) {
            throw new ApiException("Invalid OTP retry request id.");
        }

        boolean widgetEnabled = appProperties.getMsg91().isWidgetEnabled();
        if (!widgetEnabled) {
            writeAuditLog(phone, "RETRY_OTP_SKIPPED", clientIp, "MSG91 widget not configured");
            return reqId;
        }

        String nextReqId = msg91SmsService.retryWidgetOtp(reqId);
        writeAuditLog(phone, "RETRY_SUCCESS", clientIp, "OTP retried with new reqId");
        return nextReqId;
    }

    @Transactional(readOnly = true)
    public String lookupCustomerName(String phone) {
        return userRepository.findByPhone(phone)
                .filter(user -> user.getRoles().stream().anyMatch(r -> r.getName() == RoleName.CUSTOMER))
                .map(User::getFullName)
                .map(name -> name == null ? "" : name.trim())
                .orElse("");
    }

    @Transactional
    public AuthResponseDto verifyOtp(OtpVerifyDto request, String clientIp) {
        String phone = request.phone();
        boolean acceptAnyOtp = appProperties.getAuth().isAcceptAnyOtp();
        String staticOtp = appProperties.getAuth().getStaticOtp();
        boolean widgetEnabled = appProperties.getMsg91().isWidgetEnabled();

        // ── Role guard ────────────────────────────────────────────────────────────
        // ADMIN and DELIVERY_BOY cannot self-register; they must already exist in DB
        // with that role assigned by an administrator.
        RoleName roleName = parseRole(request.role());
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

        // ── Fetch active OTP record ───────────────────────────────────────────────
        OtpRecord record = otpRecordRepository
                .findActiveOtp(phone, LocalDateTime.now())
                .orElse(null);

        // When MSG91 widget is the verifier (reqId present), skip local record check —
        // MSG91 is the source of truth. Local record is still used for rate-limiting only.
        boolean usingWidget = widgetEnabled && request.reqId() != null && !request.reqId().isBlank();
        if (record == null && !acceptAnyOtp && !usingWidget) {
            writeAuditLog(phone, "VERIFY_NO_ACTIVE_OTP", clientIp, "No valid OTP found");
            throw new ApiException("OTP expired or not requested. Please request a new OTP.");
        }

        if (widgetEnabled && (request.reqId() == null || request.reqId().isBlank()) && !acceptAnyOtp) {
            writeAuditLog(phone, "VERIFY_MISSING_REQID", clientIp, "Missing MSG91 widget request id");
            throw new ApiException("Missing OTP request id. Please request a new OTP.");
        }

        // ── Max-attempts lockout ──────────────────────────────────────────────────
        if (record != null && record.getAttemptCount() >= MAX_VERIFY_ATTEMPTS) {
            writeAuditLog(phone, "VERIFY_LOCKED", clientIp, "Max verify attempts exceeded");
            throw new ApiException("OTP locked after too many failed attempts. Please request a new OTP.");
        }

        // ── Verify using MSG91 widget OTP if widget is configured ─────────────────
        // Skip widget verification if using fallback APIs (FALLBACK-API-OTP, LOCAL-OTP)
        boolean isWidgetRequestId = widgetEnabled && request.reqId() != null 
                && !request.reqId().isBlank() 
                && !request.reqId().startsWith("FALLBACK-") 
                && !request.reqId().startsWith("LOCAL-");
        
        if (isWidgetRequestId) {
            if (!msg91SmsService.verifyWidgetOtp(request.reqId(), request.otp())) {
                if (record != null) {
                    record.setAttemptCount(record.getAttemptCount() + 1);
                    otpRecordRepository.save(record);
                }
                int remaining = record != null ? MAX_VERIFY_ATTEMPTS - record.getAttemptCount() : MAX_VERIFY_ATTEMPTS;
                writeAuditLog(phone, "VERIFY_FAILED", clientIp,
                        "Invalid MSG91 access token, " + remaining + " attempt(s) remaining");
                throw new ApiException("Invalid OTP. " + remaining + " attempt(s) remaining.");
            }
        } else {
            // ── Verify against locally stored OTP hash ────────────────────────────
            // acceptAnyOtp bypasses hash check (dev/testing only)
            boolean otpValid = acceptAnyOtp
                    ? (request.otp() != null && request.otp().equals(staticOtp))
                    : (record != null && passwordEncoder.matches(request.otp(), record.getOtpHash()));
            if (!otpValid) {
                if (record != null) {
                    record.setAttemptCount(record.getAttemptCount() + 1);
                    otpRecordRepository.save(record);
                }
                int remaining = record != null ? MAX_VERIFY_ATTEMPTS - record.getAttemptCount() : MAX_VERIFY_ATTEMPTS;
                writeAuditLog(phone, "VERIFY_FAILED", clientIp,
                        "Invalid OTP, " + remaining + " attempt(s) remaining");
                throw new ApiException("Invalid OTP. " + remaining + " attempt(s) remaining.");
            }
        }

        // ── Mark OTP as consumed (one-time use) ───────────────────────────────────
        if (record != null) {
            record.setUsed(true);
            otpRecordRepository.save(record);
        }

        // ── Resolve or create user ────────────────────────────────────────────────
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ApiException("Role not configured."));

        User user = userRepository.findByPhone(phone).orElseGet(() -> {
            User u = new User();
            u.setPhone(phone);
            u.setFullName(phone); // temporary, will be updated below
            u.setPasswordHash(passwordEncoder.encode(phone));
            return u;
        });

        // For existing users, validate they actually have the requested role
        // (prevents cross-role login e.g. customer logging in as admin)
        if (user.getId() != null) {
            boolean hasRole = user.getRoles().stream().anyMatch(r -> r.getName() == roleName);
            if (!hasRole) {
                writeAuditLog(phone, "VERIFY_ROLE_MISMATCH", clientIp,
                        "Phone " + phone + " does not have role " + roleName);
                throw new ApiException("Access denied. Your account does not have the " + roleName + " role.");
            }
        } else {
            // New user – assign the requested role
            user.setRoles(new java.util.HashSet<>(Set.of(role)));
        }

        // Always update name if user provides a non-blank value; fallback to phone number
        String providedName = (request.fullName() != null) ? request.fullName().trim() : "";
        if (!providedName.isBlank()) {
            user.setFullName(providedName);
        } else if (user.getFullName() == null || user.getFullName().isBlank()) {
            user.setFullName(phone); // use phone as name when none provided
        }
        user = userRepository.save(user);

        // ── Issue JWT + refresh token ─────────────────────────────────────────────
        AuthenticatedUser principal = buildPrincipal(user);
        String accessToken  = jwtService.generateToken(principal);
        String refreshToken = jwtService.generateRefreshToken(principal);

        RefreshToken savedRefresh = new RefreshToken();
        savedRefresh.setUser(user);
        savedRefresh.setToken(refreshToken);
        savedRefresh.setExpiresAt(
                LocalDateTime.now().plusDays(appProperties.getJwt().getRefreshExpiryDays()));
        savedRefresh.setRevoked(false);
        refreshTokenRepository.save(savedRefresh);

        writeAuditLog(phone, "VERIFY_SUCCESS", clientIp,
                "Authenticated as " + roleName);

        return new AuthResponseDto(
                accessToken,
                refreshToken,
                user.getId(),
                user.getFullName(),
                user.getPhone(),
                user.getRoles().stream().map(r -> r.getName().name()).toList()
        );
    }

    @Transactional
    public AuthResponseDto refresh(RefreshTokenRequestDto request) {
        RefreshToken stored = refreshTokenRepository
                .findByTokenAndRevokedFalse(request.refreshToken())
                .orElseThrow(() -> new ApiException("Invalid refresh token."));

        if (stored.getExpiresAt().isBefore(LocalDateTime.now())
                || !jwtService.isRefreshToken(request.refreshToken())) {
            stored.setRevoked(true);
            refreshTokenRepository.save(stored);
            throw new ApiException("Refresh token expired or invalid.");
        }

        User user = stored.getUser();
        AuthenticatedUser principal = buildPrincipal(user);

        String newAccessToken  = jwtService.generateToken(principal);
        String newRefreshToken = jwtService.generateRefreshToken(principal);

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        RefreshToken rotated = new RefreshToken();
        rotated.setUser(user);
        rotated.setToken(newRefreshToken);
        rotated.setExpiresAt(
                LocalDateTime.now().plusDays(appProperties.getJwt().getRefreshExpiryDays()));
        rotated.setRevoked(false);
        refreshTokenRepository.save(rotated);

        refreshTokenRepository.deleteByExpiresAtBefore(LocalDateTime.now().minusDays(3));

        return new AuthResponseDto(
                newAccessToken,
                newRefreshToken,
                user.getId(),
                user.getFullName(),
                user.getPhone(),
                user.getRoles().stream().map(r -> r.getName().name()).toList()
        );
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Helpers
    // ══════════════════════════════════════════════════════════════════════════════

    private RoleName parseRole(String role) {
        try {
            return RoleName.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ApiException("Invalid role.");
        }
    }

    private AuthenticatedUser buildPrincipal(User user) {
        return new AuthenticatedUser(
                user.getId(),
                user.getPhone(),
                user.getPasswordHash(),
                user.getRoles().stream()
                        .map(r -> new SimpleGrantedAuthority("ROLE_" + r.getName().name()))
                        .toList()
        );
    }

    /** Fire-and-forget audit entry. Never throws — cannot break the main flow. */
    private void writeAuditLog(String phone, String eventType, String ip, String message) {
        try {
            OtpAuditLog entry = new OtpAuditLog();
            entry.setPhone(phone);
            entry.setEventType(eventType);
            entry.setIpAddress(ip);
            entry.setMessage(message);
            otpAuditLogRepository.save(entry);
        } catch (Exception ex) {
            log.error("Failed to persist OTP audit log [{}] for {}: {}", eventType, phone, ex.getMessage());
        }
    }
}


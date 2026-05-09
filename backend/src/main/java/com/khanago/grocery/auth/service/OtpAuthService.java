package com.khanago.grocery.auth.service;

import com.khanago.grocery.auth.dto.AuthResponseDto;
import com.khanago.grocery.auth.dto.OtpRequestDto;
import com.khanago.grocery.auth.dto.RefreshTokenRequestDto;
import com.khanago.grocery.auth.dto.OtpVerifyDto;
import com.khanago.grocery.auth.RefreshToken;
import com.khanago.grocery.auth.repository.RefreshTokenRepository;
import com.khanago.grocery.config.AppProperties;
import com.khanago.grocery.common.exception.ApiException;
import com.khanago.grocery.common.enums.RoleName;
import com.khanago.grocery.security.AuthenticatedUser;
import com.khanago.grocery.security.JwtService;
import com.khanago.grocery.user.Role;
import com.khanago.grocery.user.User;
import com.khanago.grocery.user.repository.RoleRepository;
import com.khanago.grocery.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class OtpAuthService {

    private static final String SIMULATED_OTP = "123456";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AppProperties appProperties;

    private final Map<String, Instant> otpRequests = new ConcurrentHashMap<>();
    private final Map<String, Instant> otpCooldownByPhone = new ConcurrentHashMap<>();
    private final Map<String, Integer> otpRequestCountByPhone = new ConcurrentHashMap<>();
    private final Map<String, Instant> otpRequestWindowStart = new ConcurrentHashMap<>();

    public String requestOtp(OtpRequestDto request) {
        enforceOtpRequestLimits(request.phone());
        otpRequests.put(request.phone(), Instant.now().plusSeconds(300));
        return "OTP sent (simulation only). Use 123456.";
    }

    public AuthResponseDto verifyOtp(OtpVerifyDto request) {
        Instant expiry = otpRequests.get(request.phone());
        if (expiry == null || Instant.now().isAfter(expiry)) {
            throw new ApiException("OTP expired. Request a new OTP.");
        }
        if (!SIMULATED_OTP.equals(request.otp())) {
            throw new ApiException("Invalid OTP.");
        }

        RoleName roleName;
        try {
            roleName = RoleName.valueOf(request.role().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ApiException("Invalid role.");
        }

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ApiException("Role not configured."));

        User user = userRepository.findByPhone(request.phone()).orElseGet(() -> {
            User u = new User();
            u.setPhone(request.phone());
            u.setFullName(request.fullName());
            u.setPasswordHash(passwordEncoder.encode(request.phone()));
            return u;
        });

        if (user.getFullName() == null || user.getFullName().isBlank()) {
            user.setFullName(request.fullName());
        }

        user.setRoles(Set.of(role));
        user = userRepository.save(user);

        AuthenticatedUser principal = new AuthenticatedUser(
                user.getId(),
                user.getPhone(),
                user.getPasswordHash(),
                user.getRoles().stream()
                        .map(r -> new SimpleGrantedAuthority("ROLE_" + r.getName().name()))
                        .toList()
        );

        String token = jwtService.generateToken(principal);
        String refreshToken = jwtService.generateRefreshToken(principal);

        RefreshToken savedRefresh = new RefreshToken();
        savedRefresh.setUser(user);
        savedRefresh.setToken(refreshToken);
        savedRefresh.setExpiresAt(LocalDateTime.now().plusDays(appProperties.getJwt().getRefreshExpiryDays()));
        savedRefresh.setRevoked(false);
        refreshTokenRepository.save(savedRefresh);

        return new AuthResponseDto(
                token,
                refreshToken,
                user.getId(),
                user.getFullName(),
                user.getPhone(),
                user.getRoles().stream().map(r -> r.getName().name()).toList()
        );
    }

    public AuthResponseDto refresh(RefreshTokenRequestDto request) {
        RefreshToken stored = refreshTokenRepository.findByTokenAndRevokedFalse(request.refreshToken())
                .orElseThrow(() -> new ApiException("Invalid refresh token."));

        if (stored.getExpiresAt().isBefore(LocalDateTime.now()) || !jwtService.isRefreshToken(request.refreshToken())) {
            stored.setRevoked(true);
            refreshTokenRepository.save(stored);
            throw new ApiException("Refresh token expired or invalid.");
        }

        User user = stored.getUser();
        AuthenticatedUser principal = new AuthenticatedUser(
                user.getId(),
                user.getPhone(),
                user.getPasswordHash(),
                user.getRoles().stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r.getName().name())).toList()
        );

        String accessToken = jwtService.generateToken(principal);
        String newRefreshToken = jwtService.generateRefreshToken(principal);

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        RefreshToken rotated = new RefreshToken();
        rotated.setUser(user);
        rotated.setToken(newRefreshToken);
        rotated.setExpiresAt(LocalDateTime.now().plusDays(appProperties.getJwt().getRefreshExpiryDays()));
        rotated.setRevoked(false);
        refreshTokenRepository.save(rotated);

        refreshTokenRepository.deleteByExpiresAtBefore(LocalDateTime.now().minusDays(3));

        return new AuthResponseDto(
                accessToken,
                newRefreshToken,
                user.getId(),
                user.getFullName(),
                user.getPhone(),
                user.getRoles().stream().map(r -> r.getName().name()).toList()
        );
    }

    private void enforceOtpRequestLimits(String phone) {
        Instant now = Instant.now();
        Instant cooldownEnd = otpCooldownByPhone.get(phone);
        if (cooldownEnd != null && now.isBefore(cooldownEnd)) {
            throw new ApiException("Too many OTP requests. Please wait before retrying.");
        }

        Instant windowStart = otpRequestWindowStart.get(phone);
        if (windowStart == null || now.isAfter(windowStart.plus(10, ChronoUnit.MINUTES))) {
            otpRequestWindowStart.put(phone, now);
            otpRequestCountByPhone.put(phone, 1);
            otpCooldownByPhone.put(phone, now.plus(30, ChronoUnit.SECONDS));
            return;
        }

        int count = otpRequestCountByPhone.getOrDefault(phone, 0) + 1;
        otpRequestCountByPhone.put(phone, count);
        otpCooldownByPhone.put(phone, now.plus(30, ChronoUnit.SECONDS));

        if (count > 5) {
            otpCooldownByPhone.put(phone, now.plus(15, ChronoUnit.MINUTES));
            throw new ApiException("OTP request limit reached. Try again in 15 minutes.");
        }
    }
}

package com.khanago.grocery.auth.controller;

import com.khanago.grocery.auth.dto.AuthResponseDto;
import com.khanago.grocery.auth.dto.OtpRequestDto;
import com.khanago.grocery.auth.dto.OtpRetryDto;
import com.khanago.grocery.auth.dto.RefreshTokenRequestDto;
import com.khanago.grocery.auth.dto.OtpVerifyDto;
import com.khanago.grocery.auth.service.OtpAuthService;
import com.khanago.grocery.common.dto.ApiSuccessResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final OtpAuthService otpAuthService;

    @PostMapping("/request-otp")
    public ApiSuccessResponse<String> requestOtp(
            @Valid @RequestBody OtpRequestDto request,
            HttpServletRequest httpRequest) {
        return new ApiSuccessResponse<>("OTP sent",
                otpAuthService.requestOtp(request, extractClientIp(httpRequest)));
    }

    @PostMapping("/lookup-customer")
    public ApiSuccessResponse<String> lookupCustomer(@Valid @RequestBody OtpRequestDto request) {
        return new ApiSuccessResponse<>("Lookup completed",
                otpAuthService.lookupCustomerName(request.phone()));
    }

    @PostMapping("/retry-otp")
    public ApiSuccessResponse<String> retryOtp(
            @Valid @RequestBody OtpRetryDto request,
            HttpServletRequest httpRequest) {
        return new ApiSuccessResponse<>("OTP resent",
                otpAuthService.retryOtp(request.phone(), request.reqId(), extractClientIp(httpRequest)));
    }

    @PostMapping("/verify-otp")
    public ApiSuccessResponse<AuthResponseDto> verifyOtp(
            @Valid @RequestBody OtpVerifyDto request,
            HttpServletRequest httpRequest) {
        return new ApiSuccessResponse<>("Authenticated successfully",
                otpAuthService.verifyOtp(request, extractClientIp(httpRequest)));
    }

    @PostMapping("/refresh")
    public ApiSuccessResponse<AuthResponseDto> refresh(@Valid @RequestBody RefreshTokenRequestDto request) {
        return new ApiSuccessResponse<>("Token refreshed", otpAuthService.refresh(request));
    }

    @PostMapping("/keep-alive")
    public ApiSuccessResponse<Map<String, String>> keepAlive(HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        log.debug("🔄 Keep-alive heartbeat from IP: {}", clientIp);
        
        Map<String, String> response = new HashMap<>();
        response.put("status", "alive");
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("serverTime", String.valueOf(System.currentTimeMillis()));
        
        return new ApiSuccessResponse<>("keep-alive acknowledged", response);
    }

    @GetMapping("/health")
    public ApiSuccessResponse<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("timestamp", LocalDateTime.now());
        health.put("service", "OrderKro Auth Service");
        health.put("version", "1.0.0");
        
        return new ApiSuccessResponse<>("Health check passed", health);
    }

    /** Prefer X-Forwarded-For (set by Nginx/load-balancer) over the raw socket address. */
    private String extractClientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}


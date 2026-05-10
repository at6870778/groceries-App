package com.khanago.grocery.auth.controller;

import com.khanago.grocery.auth.dto.AuthResponseDto;
import com.khanago.grocery.auth.dto.OtpRequestDto;
import com.khanago.grocery.auth.dto.RefreshTokenRequestDto;
import com.khanago.grocery.auth.dto.OtpVerifyDto;
import com.khanago.grocery.auth.service.OtpAuthService;
import com.khanago.grocery.common.dto.ApiSuccessResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    /** Prefer X-Forwarded-For (set by Nginx/load-balancer) over the raw socket address. */
    private String extractClientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}


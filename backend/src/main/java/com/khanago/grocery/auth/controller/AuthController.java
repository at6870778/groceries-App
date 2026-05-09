package com.khanago.grocery.auth.controller;

import com.khanago.grocery.auth.dto.AuthResponseDto;
import com.khanago.grocery.auth.dto.OtpRequestDto;
import com.khanago.grocery.auth.dto.RefreshTokenRequestDto;
import com.khanago.grocery.auth.dto.OtpVerifyDto;
import com.khanago.grocery.auth.service.OtpAuthService;
import com.khanago.grocery.common.dto.ApiSuccessResponse;
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
    public ApiSuccessResponse<String> requestOtp(@Valid @RequestBody OtpRequestDto request) {
        return new ApiSuccessResponse<>("OTP generated", otpAuthService.requestOtp(request));
    }

    @PostMapping("/verify-otp")
    public ApiSuccessResponse<AuthResponseDto> verifyOtp(@Valid @RequestBody OtpVerifyDto request) {
        return new ApiSuccessResponse<>("Authenticated successfully", otpAuthService.verifyOtp(request));
    }

    @PostMapping("/refresh")
    public ApiSuccessResponse<AuthResponseDto> refresh(@Valid @RequestBody RefreshTokenRequestDto request) {
        return new ApiSuccessResponse<>("Token refreshed", otpAuthService.refresh(request));
    }
}

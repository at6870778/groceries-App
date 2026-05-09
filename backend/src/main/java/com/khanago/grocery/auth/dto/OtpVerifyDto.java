package com.khanago.grocery.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record OtpVerifyDto(
        @NotBlank @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be 10 digits") String phone,
        @NotBlank @Pattern(regexp = "^[0-9]{6}$", message = "OTP must be 6 digits") String otp,
        @NotBlank String fullName,
        @NotBlank String role
) {
}

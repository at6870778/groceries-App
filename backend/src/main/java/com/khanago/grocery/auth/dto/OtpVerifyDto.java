package com.khanago.grocery.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OtpVerifyDto(
        @NotBlank @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be 10 digits") String phone,
        @NotBlank @Size(min = 4, max = 32, message = "OTP must be between 4 and 32 characters") String otp,
        @NotBlank String fullName,
        @NotBlank String role
) {
}

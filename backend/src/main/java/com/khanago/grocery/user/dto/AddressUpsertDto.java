package com.khanago.grocery.user.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record AddressUpsertDto(
        @NotBlank String label,
        @NotBlank String line1,
        String line2,
        @NotBlank String city,
        @NotBlank String state,
        @NotBlank String postalCode,
        String village,
        String landmark,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean isDefault
) {
}

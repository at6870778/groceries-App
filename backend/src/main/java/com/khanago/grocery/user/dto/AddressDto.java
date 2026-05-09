package com.khanago.grocery.user.dto;

import java.math.BigDecimal;

public record AddressDto(
        Long id,
        String label,
        String line1,
        String line2,
        String city,
        String state,
        String postalCode,
        String landmark,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean isDefault
) {
}

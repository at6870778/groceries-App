package com.khanago.grocery.delivery.dto;

import java.math.BigDecimal;

public record DeliveryFeeDto(
        BigDecimal fee,
        double distanceKm,
        String method,
        String feeLabel
) {}

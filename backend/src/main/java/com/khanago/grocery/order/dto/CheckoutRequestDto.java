package com.khanago.grocery.order.dto;

import com.khanago.grocery.common.enums.PaymentMode;

public record CheckoutRequestDto(
        Long addressId,
        PaymentMode paymentMode,
        String notes,
        Double customerLat,
        Double customerLng
) {}

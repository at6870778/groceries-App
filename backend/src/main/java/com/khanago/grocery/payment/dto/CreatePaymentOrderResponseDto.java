package com.khanago.grocery.payment.dto;

public record CreatePaymentOrderResponseDto(
        String keyId,
        String orderId,
        Integer amount,
        String currency,
        String name,
        String description,
        String prefillContact
) {
}

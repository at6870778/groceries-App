package com.khanago.grocery.order.dto;

import com.khanago.grocery.common.enums.PaymentMode;
import jakarta.validation.constraints.NotNull;

public record CheckoutRequestDto(@NotNull Long addressId, PaymentMode paymentMode, String notes) {
}

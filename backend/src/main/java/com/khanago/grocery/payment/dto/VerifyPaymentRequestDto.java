package com.khanago.grocery.payment.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyPaymentRequestDto(
        @NotBlank String razorpayOrderId,
        @NotBlank String razorpayPaymentId,
        @NotBlank String razorpaySignature
) {
}

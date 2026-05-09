package com.khanago.grocery.delivery.dto;

import jakarta.validation.constraints.NotNull;

public record DeliveryAssignmentRequestDto(
        @NotNull Long orderId,
        @NotNull Long deliveryBoyId
) {
}

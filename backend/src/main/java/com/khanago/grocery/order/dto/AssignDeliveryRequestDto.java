package com.khanago.grocery.order.dto;

import jakarta.validation.constraints.NotNull;

public record AssignDeliveryRequestDto(@NotNull Long deliveryBoyId) {
}

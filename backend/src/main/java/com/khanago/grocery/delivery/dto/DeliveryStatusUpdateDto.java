package com.khanago.grocery.delivery.dto;

import jakarta.validation.constraints.NotBlank;

public record DeliveryStatusUpdateDto(@NotBlank String status) {
}

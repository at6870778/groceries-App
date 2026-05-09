package com.khanago.grocery.order.dto;

import jakarta.validation.constraints.NotBlank;

public record OrderStatusUpdateDto(@NotBlank String status) {
}

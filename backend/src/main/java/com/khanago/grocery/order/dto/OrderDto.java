package com.khanago.grocery.order.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderDto(
        Long id,
        Long assignmentId,
        String status,
        String paymentMode,
        BigDecimal subtotal,
        BigDecimal deliveryFee,
        BigDecimal totalAmount,
        String notes,
        LocalDateTime createdAt,
        List<OrderItemDto> items
) {
}

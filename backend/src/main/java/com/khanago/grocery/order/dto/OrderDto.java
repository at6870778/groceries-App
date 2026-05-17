package com.khanago.grocery.order.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderDto(
        Long id,
        Long assignmentId,
        String assignmentStatus,
        String status,
        String paymentMode,
        BigDecimal subtotal,
        BigDecimal deliveryFee,
        BigDecimal totalAmount,
        String notes,
        Instant createdAt,
        List<OrderItemDto> items,
        String customerName,
        String customerPhone,
        String deliveryAddress
) {
}

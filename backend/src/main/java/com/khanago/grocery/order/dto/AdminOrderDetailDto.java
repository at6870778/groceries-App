package com.khanago.grocery.order.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record AdminOrderDetailDto(
        Long id,
        String customerName,
        String customerPhone,
        String deliveryAddress,
        String status,
        String paymentMode,
        BigDecimal subtotal,
        BigDecimal deliveryFee,
        BigDecimal totalAmount,
        String notes,
        LocalDateTime createdAt,
        Long assignmentId,
        String deliveryBoyName,
        String deliveryStatus,
        List<OrderItemDto> items
) {
}

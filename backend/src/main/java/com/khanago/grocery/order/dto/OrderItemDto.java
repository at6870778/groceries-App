package com.khanago.grocery.order.dto;

import java.math.BigDecimal;

public record OrderItemDto(String productName, String unit, Integer quantity, BigDecimal unitPrice, BigDecimal lineTotal) {
}

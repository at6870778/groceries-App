package com.khanago.grocery.cart.dto;

import java.math.BigDecimal;

public record CartItemDto(Long id, Long productId, String name, String unit, Integer quantity, BigDecimal unitPrice, BigDecimal lineTotal) {
}

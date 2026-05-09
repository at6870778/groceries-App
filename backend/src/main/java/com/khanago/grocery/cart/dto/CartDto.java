package com.khanago.grocery.cart.dto;

import java.math.BigDecimal;
import java.util.List;

public record CartDto(Long cartId, List<CartItemDto> items, BigDecimal subtotal) {
}

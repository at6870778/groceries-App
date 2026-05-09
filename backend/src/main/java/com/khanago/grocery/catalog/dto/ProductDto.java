package com.khanago.grocery.catalog.dto;

import java.math.BigDecimal;

public record ProductDto(
        Long id,
        Long categoryId,
        String categoryName,
        String name,
        String sku,
        String description,
        String unit,
        BigDecimal mrp,
        BigDecimal sellingPrice,
        Integer stockQty,
        String imageUrl,
        boolean active
) {
}

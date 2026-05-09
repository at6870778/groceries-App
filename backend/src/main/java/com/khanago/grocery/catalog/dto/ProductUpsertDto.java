package com.khanago.grocery.catalog.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ProductUpsertDto(
        @NotNull Long categoryId,
        @NotBlank String name,
        @NotBlank String sku,
        String description,
        @NotBlank String unit,
        @NotNull @DecimalMin("0.0") BigDecimal mrp,
        @NotNull @DecimalMin("0.0") BigDecimal sellingPrice,
        @NotNull @Min(0) Integer stockQty,
        String imageUrl,
        boolean active
) {
}

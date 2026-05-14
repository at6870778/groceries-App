package com.khanago.grocery.catalog.dto;

import java.math.BigDecimal;

public record RestaurantDto(
        Long id,
        String name,
        String cuisineType,
        String address,
        String phone,
        String imageUrl,
        BigDecimal rating,
        Integer deliveryTimeMin,
        boolean active,
        Double latitude,
        Double longitude,
        Double distanceKm
) {}

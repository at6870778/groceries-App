package com.khanago.grocery.catalog.dto;

public record CategoryDto(Long id, String name, String slug, String imageUrl, boolean active) {
}

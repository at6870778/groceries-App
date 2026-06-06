package com.khanago.grocery.catalog.dto;

public record CategoryDto(Long id, String name, String slug, String imageUrl, String emoji, boolean active) {
}

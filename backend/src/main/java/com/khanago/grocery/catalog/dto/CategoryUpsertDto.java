package com.khanago.grocery.catalog.dto;

import jakarta.validation.constraints.NotBlank;

public record CategoryUpsertDto(@NotBlank String name, @NotBlank String slug, String imageUrl, boolean active) {
}

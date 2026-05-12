package com.khanago.grocery.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileDto(
        @NotBlank @Size(min = 2, max = 120, message = "Name must be between 2 and 120 characters") String fullName
) {
}

package com.khanago.grocery.admin.dto;

import jakarta.validation.constraints.NotNull;

public record AdminUserActiveUpdateDto(@NotNull Boolean active) {
}

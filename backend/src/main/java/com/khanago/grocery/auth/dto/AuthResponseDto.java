package com.khanago.grocery.auth.dto;

import java.util.List;

public record AuthResponseDto(String token, String refreshToken, Long userId, String fullName, String phone, List<String> roles) {
}

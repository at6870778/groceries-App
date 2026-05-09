package com.khanago.grocery.user.dto;

import java.util.List;

public record ProfileDto(Long userId, String fullName, String phone, List<String> roles) {
}

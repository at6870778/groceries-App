package com.khanago.grocery.admin.dto;

import java.util.List;

public record AdminUserDto(Long id, String fullName, String phone, boolean active, List<String> roles) {
}

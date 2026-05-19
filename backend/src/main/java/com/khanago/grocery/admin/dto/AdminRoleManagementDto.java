package com.khanago.grocery.admin.dto;

import java.util.List;

public record AdminRoleManagementDto(
        Long userId,
        String fullName,
        String phone,
        boolean active,
        List<RoleAssignmentDto> roles
) {
}

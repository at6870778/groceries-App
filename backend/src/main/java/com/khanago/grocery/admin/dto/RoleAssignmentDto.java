package com.khanago.grocery.admin.dto;

public record RoleAssignmentDto(
        Long roleId,
        String roleName,
        boolean assigned
) {
}

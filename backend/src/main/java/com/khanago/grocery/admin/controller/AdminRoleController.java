package com.khanago.grocery.admin.controller;

import com.khanago.grocery.admin.dto.AdminRoleManagementDto;
import com.khanago.grocery.admin.dto.AssignRolesDto;
import com.khanago.grocery.admin.service.AdminRoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
public class AdminRoleController {

    private final AdminRoleService adminRoleService;

    /**
     * Search user by phone number and get their current roles + all available roles
     * GET /api/admin/roles/user/search?phone=8874329945
     */
    @GetMapping("/user/search")
    public AdminRoleManagementDto searchUserByPhone(@RequestParam String phone) {
        return adminRoleService.getUserByPhone(phone);
    }

    /**
     * Get user with all available roles by user ID
     * GET /api/admin/roles/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public AdminRoleManagementDto getUserRoles(@PathVariable Long userId) {
        return adminRoleService.getUserWithAvailableRoles(userId);
    }

    /**
     * Assign multiple roles to a user (replaces existing roles)
     * POST /api/admin/roles/user/{userId}
     * Body: { "roleIds": [1, 2, 3] }
     */
    @PostMapping("/user/{userId}")
    public AdminRoleManagementDto assignRoles(
            @PathVariable Long userId,
            @Valid @RequestBody AssignRolesDto request) {
        return adminRoleService.assignRoles(userId, request.roleIds());
    }

    /**
     * Add a single role to user
     * POST /api/admin/roles/user/{userId}/role/{roleId}
     */
    @PostMapping("/user/{userId}/role/{roleId}")
    public AdminRoleManagementDto addRole(
            @PathVariable Long userId,
            @PathVariable Long roleId) {
        return adminRoleService.addRole(userId, roleId);
    }

    /**
     * Remove a single role from user
     * DELETE /api/admin/roles/user/{userId}/role/{roleId}
     */
    @DeleteMapping("/user/{userId}/role/{roleId}")
    public AdminRoleManagementDto removeRole(
            @PathVariable Long userId,
            @PathVariable Long roleId) {
        return adminRoleService.removeRole(userId, roleId);
    }
}

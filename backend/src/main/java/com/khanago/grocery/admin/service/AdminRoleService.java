package com.khanago.grocery.admin.service;

import com.khanago.grocery.admin.dto.AdminRoleManagementDto;
import com.khanago.grocery.admin.dto.RoleAssignmentDto;
import com.khanago.grocery.common.enums.RoleName;
import com.khanago.grocery.common.exception.ApiException;
import com.khanago.grocery.user.Role;
import com.khanago.grocery.user.User;
import com.khanago.grocery.user.repository.RoleRepository;
import com.khanago.grocery.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminRoleService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    /**
     * Search user by phone number
     */
    public AdminRoleManagementDto getUserByPhone(String phone) {
        User user = userRepository.findByPhone(phone)
                .orElseThrow(() -> new ApiException("User not found with phone: " + phone));
        return toRoleManagementDto(user);
    }

    /**
     * Get user with all available roles (for assignment UI)
     */
    public AdminRoleManagementDto getUserWithAvailableRoles(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found with ID: " + userId));
        return toRoleManagementDto(user);
    }

    /**
     * Assign multiple roles to a user (replaces existing roles)
     */
    @Transactional
    public AdminRoleManagementDto assignRoles(Long userId, List<Long> roleIds) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));

        List<Role> roles = roleRepository.findAllById(roleIds);
        if (roles.size() != roleIds.size()) {
            throw new ApiException("Some roles not found");
        }

        user.setRoles(new HashSet<>(roles));
        User saved = userRepository.save(user);
        return toRoleManagementDto(saved);
    }

    /**
     * Add a single role to user (if not already assigned)
     */
    @Transactional
    public AdminRoleManagementDto addRole(Long userId, Long roleId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ApiException("Role not found"));

        user.getRoles().add(role);
        User saved = userRepository.save(user);
        return toRoleManagementDto(saved);
    }

    /**
     * Remove a single role from user
     */
    @Transactional
    public AdminRoleManagementDto removeRole(Long userId, Long roleId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ApiException("Role not found"));

        user.getRoles().remove(role);
        User saved = userRepository.save(user);
        return toRoleManagementDto(saved);
    }

    /**
     * Convert User to AdminRoleManagementDto showing all available roles
     */
    private AdminRoleManagementDto toRoleManagementDto(User user) {
        Set<Long> userRoleIds = user.getRoles().stream()
                .map(Role::getId)
                .collect(Collectors.toSet());

        List<RoleAssignmentDto> allRoles = roleRepository.findAll().stream()
                .map(role -> new RoleAssignmentDto(
                        role.getId(),
                        role.getName().name(),
                        userRoleIds.contains(role.getId())
                ))
                .collect(Collectors.toList());

        return new AdminRoleManagementDto(
                user.getId(),
                user.getFullName(),
                user.getPhone(),
                user.isActive(),
                allRoles
        );
    }
}

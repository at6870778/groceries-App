package com.khanago.grocery.security;

import com.khanago.grocery.common.exception.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Locale;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
            throw new ApiException("Unauthenticated");
        }
        return user.id();
    }

    public static boolean hasRole(String roleName) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        String normalized = roleName.toUpperCase(Locale.ROOT);
        String springRole = "ROLE_" + normalized;
        return authentication.getAuthorities().stream()
                .anyMatch(a -> springRole.equals(a.getAuthority()));
    }
}

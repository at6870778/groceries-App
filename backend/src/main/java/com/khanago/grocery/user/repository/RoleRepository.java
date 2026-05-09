package com.khanago.grocery.user.repository;

import com.khanago.grocery.common.enums.RoleName;
import com.khanago.grocery.user.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleName name);
}

package com.khanago.grocery.user.repository;

import com.khanago.grocery.common.enums.RoleName;
import com.khanago.grocery.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByPhone(String phone);

    Page<User> findByRoles_Name(RoleName roleName, Pageable pageable);

    List<User> findByRoles_Name(RoleName roleName);

    long countByRoles_Name(RoleName roleName);
}

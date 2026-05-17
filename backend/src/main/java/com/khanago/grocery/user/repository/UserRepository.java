package com.khanago.grocery.user.repository;

import com.khanago.grocery.common.enums.RoleName;
import com.khanago.grocery.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByPhone(String phone);

    Page<User> findByRoles_Name(RoleName roleName, Pageable pageable);

    List<User> findByRoles_Name(RoleName roleName);

    long countByRoles_Name(RoleName roleName);

    /**
     * Search customers by name or phone number (partial match, case-insensitive)
     */
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = :roleName AND (LOWER(u.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR LOWER(u.phone) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    List<User> searchCustomers(@Param("roleName") RoleName roleName, @Param("searchTerm") String searchTerm);
}

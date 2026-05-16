package com.khanago.grocery.user.repository;

import com.khanago.grocery.user.Address;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AddressRepository extends JpaRepository<Address, Long> {
    List<Address> findByUserId(Long userId);

    Address findTopByUserIdOrderByIdDesc(Long userId);
}

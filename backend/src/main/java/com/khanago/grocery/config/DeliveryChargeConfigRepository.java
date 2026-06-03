package com.khanago.grocery.config;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface DeliveryChargeConfigRepository extends JpaRepository<DeliveryChargeConfig, Long> {
    Optional<DeliveryChargeConfig> findByIsActiveTrue();
}

package com.khanago.grocery.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliveryChargeService {
    
    private final DeliveryChargeConfigRepository repository;
    
    // In-memory cache with TTL to prevent DB hits on every order
    private volatile DeliveryChargeDto cachedCharge = null;
    private volatile long cacheExpireTime = 0;
    private static final long CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
    
    /**
     * Get current active delivery charge
     * Uses in-memory cache with 5-minute TTL to minimize database hits
     */
    public DeliveryChargeDto getDeliveryCharge() {
        long currentTime = System.currentTimeMillis();
        
        // Return cached value if still valid
        if (cachedCharge != null && currentTime < cacheExpireTime) {
            log.trace("Returning cached delivery charge");
            return cachedCharge;
        }
        
        // Fetch from DB and update cache
        log.debug("Cache expired or first fetch, querying database for delivery charge");
        DeliveryChargeDto charge = repository.findByIsActiveTrue()
                .map(DeliveryChargeDto::fromEntity)
                .orElseGet(() -> {
                    log.warn("No active delivery charge config found, returning default 0");
                    return DeliveryChargeDto.builder()
                            .chargeAmount(BigDecimal.ZERO)
                            .description("Default - no charge")
                            .isActive(true)
                            .build();
                });
        
        // Update cache
        synchronized (this) {
            this.cachedCharge = charge;
            this.cacheExpireTime = currentTime + CACHE_TTL_MS;
        }
        
        return charge;
    }
    
    /**
     * Get delivery charge amount only (for quick access)
     * Also uses cache - minimal overhead
     */
    public BigDecimal getDeliveryChargeAmount() {
        return getDeliveryCharge().getChargeAmount();
    }
    
    /**
     * Update delivery charge (admin only)
     * Invalidates cache immediately so new charge takes effect
     */
    @Transactional
    public DeliveryChargeDto updateDeliveryCharge(BigDecimal chargeAmount, String description, String adminEmail) {
        log.info("ADMIN [{}]: Updating delivery charge to {}", adminEmail, chargeAmount);
        
        // Deactivate all existing configs
        repository.findByIsActiveTrue().ifPresent(config -> {
            config.setIsActive(false);
            repository.save(config);
        });
        
        // Create new config
        DeliveryChargeConfig config = DeliveryChargeConfig.builder()
                .chargeAmount(chargeAmount)
                .description(description)
                .isActive(true)
                .updatedBy(adminEmail)
                .build();
        
        DeliveryChargeConfig saved = repository.save(config);
        
        // Invalidate cache immediately
        synchronized (this) {
            this.cachedCharge = null;
            this.cacheExpireTime = 0;
        }
        
        log.info("Delivery charge updated successfully to: {} | Cache invalidated for immediate effect", chargeAmount);
        return DeliveryChargeDto.fromEntity(saved);
    }
    
    /**
     * Get all historical configs (for audit log)
     */
    public java.util.List<DeliveryChargeDto> getAllConfigs() {
        log.debug("Fetching all delivery charge configs");
        return repository.findAll()
                .stream()
                .map(DeliveryChargeDto::fromEntity)
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .toList();
    }
}

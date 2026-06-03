package com.khanago.grocery.admin.controller;

import com.khanago.grocery.config.DeliveryChargeDto;
import com.khanago.grocery.config.DeliveryChargeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin/delivery-charge")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDeliveryChargeController {
    
    private final DeliveryChargeService deliveryChargeService;
    
    /**
     * Get current delivery charge
     */
    @GetMapping
    public ResponseEntity<DeliveryChargeDto> getDeliveryCharge() {
        log.info("ADMIN: Fetching current delivery charge");
        return ResponseEntity.ok(deliveryChargeService.getDeliveryCharge());
    }
    
    /**
     * Get all historical delivery charge configs
     */
    @GetMapping("/history")
    public ResponseEntity<List<DeliveryChargeDto>> getHistory() {
        log.info("ADMIN: Fetching delivery charge history");
        return ResponseEntity.ok(deliveryChargeService.getAllConfigs());
    }
    
    /**
     * Update delivery charge
     * Request body: { "chargeAmount": 50 }
     */
    @PutMapping
    public ResponseEntity<DeliveryChargeDto> updateDeliveryCharge(
            @RequestBody Map<String, Object> request,
            Authentication authentication) {
        
        BigDecimal chargeAmount = new BigDecimal(request.get("chargeAmount").toString());
        String description = request.containsKey("description") ? 
                request.get("description").toString() : "Updated delivery charge";
        String adminEmail = authentication.getName();
        
        log.info("ADMIN [{}]: Updating delivery charge to {}", adminEmail, chargeAmount);
        DeliveryChargeDto updated = deliveryChargeService.updateDeliveryCharge(
                chargeAmount, 
                description, 
                adminEmail
        );
        
        return ResponseEntity.ok(updated);
    }
}

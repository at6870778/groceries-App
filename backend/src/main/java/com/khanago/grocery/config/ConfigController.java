package com.khanago.grocery.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/config")
@RequiredArgsConstructor
public class ConfigController {
    
    private final DeliveryChargeService deliveryChargeService;
    
    /**
     * Get current delivery charge (public - for ionic app)
     */
    @GetMapping("/delivery-charge")
    public ResponseEntity<Map<String, Object>> getDeliveryCharge() {
        log.debug("GET /api/v1/config/delivery-charge");
        DeliveryChargeDto charge = deliveryChargeService.getDeliveryCharge();
        
        Map<String, Object> response = new HashMap<>();
        response.put("chargeAmount", charge.getChargeAmount());
        response.put("description", charge.getDescription());
        
        return ResponseEntity.ok(response);
    }
}

package com.khanago.grocery.config;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryChargeDto {
    private Long id;
    private BigDecimal chargeAmount;
    private String description;
    private Boolean isActive;
    
    public static DeliveryChargeDto fromEntity(DeliveryChargeConfig config) {
        return DeliveryChargeDto.builder()
                .id(config.getId())
                .chargeAmount(config.getChargeAmount())
                .description(config.getDescription())
                .isActive(config.getIsActive())
                .build();
    }
}

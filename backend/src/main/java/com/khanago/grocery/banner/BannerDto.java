package com.khanago.grocery.banner;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BannerDto {
    private Long id;
    private String imageUrl;
    private Integer displayOrder;
    private Boolean isActive;
    private String title;
    private String description;
    
    public static BannerDto fromEntity(Banner banner) {
        return BannerDto.builder()
                .id(banner.getId())
                .imageUrl(banner.getImageUrl())
                .displayOrder(banner.getDisplayOrder())
                .isActive(banner.getIsActive())
                .title(banner.getTitle())
                .description(banner.getDescription())
                .build();
    }
}

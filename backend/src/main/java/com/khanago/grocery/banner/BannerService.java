package com.khanago.grocery.banner;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BannerService {
    
    private final BannerRepository bannerRepository;
    
    /**
     * Get all active banners sorted by display order
     */
    public List<BannerDto> getActiveBanners() {
        log.info("Fetching active banners");
        return bannerRepository.findAllByIsActiveTrueOrderByDisplayOrder()
                .stream()
                .map(BannerDto::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Get all banners (admin view)
     */
    public List<BannerDto> getAllBanners() {
        log.info("Fetching all banners");
        return bannerRepository.findAll()
                .stream()
                .map(BannerDto::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Get banner by ID
     */
    public BannerDto getBannerById(Long id) {
        log.info("Fetching banner with id: {}", id);
        return bannerRepository.findById(id)
                .map(BannerDto::fromEntity)
                .orElseThrow(() -> new RuntimeException("Banner not found"));
    }
    
    /**
     * Create new banner
     */
    @Transactional
    public BannerDto createBanner(Banner banner) {
        log.info("Creating new banner with title: {}", banner.getTitle());
        if (banner.getDisplayOrder() == null) {
            Integer maxOrder = bannerRepository.findAll()
                    .stream()
                    .map(Banner::getDisplayOrder)
                    .max(Integer::compare)
                    .orElse(0);
            banner.setDisplayOrder(maxOrder + 1);
        }
        Banner saved = bannerRepository.save(banner);
        log.info("Banner created with id: {}", saved.getId());
        return BannerDto.fromEntity(saved);
    }
    
    /**
     * Update banner
     */
    @Transactional
    public BannerDto updateBanner(Long id, Banner bannerDetails) {
        log.info("Updating banner with id: {}", id);
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Banner not found"));
        
        if (bannerDetails.getImageUrl() != null) {
            banner.setImageUrl(bannerDetails.getImageUrl());
        }
        if (bannerDetails.getDisplayOrder() != null) {
            banner.setDisplayOrder(bannerDetails.getDisplayOrder());
        }
        if (bannerDetails.getIsActive() != null) {
            banner.setIsActive(bannerDetails.getIsActive());
        }
        if (bannerDetails.getTitle() != null) {
            banner.setTitle(bannerDetails.getTitle());
        }
        if (bannerDetails.getDescription() != null) {
            banner.setDescription(bannerDetails.getDescription());
        }
        
        Banner updated = bannerRepository.save(banner);
        log.info("Banner updated successfully");
        return BannerDto.fromEntity(updated);
    }
    
    /**
     * Toggle banner active status
     */
    @Transactional
    public BannerDto toggleBannerStatus(Long id) {
        log.info("Toggling banner status for id: {}", id);
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Banner not found"));
        
        banner.setIsActive(!banner.getIsActive());
        Banner updated = bannerRepository.save(banner);
        log.info("Banner status toggled to: {}", updated.getIsActive());
        return BannerDto.fromEntity(updated);
    }
    
    /**
     * Delete banner
     */
    @Transactional
    public void deleteBanner(Long id) {
        log.info("Deleting banner with id: {}", id);
        bannerRepository.deleteById(id);
        log.info("Banner deleted successfully");
    }
}

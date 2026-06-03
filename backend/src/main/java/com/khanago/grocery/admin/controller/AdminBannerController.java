package com.khanago.grocery.admin.controller;

import com.khanago.grocery.banner.Banner;
import com.khanago.grocery.banner.BannerDto;
import com.khanago.grocery.banner.BannerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin/banners")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminBannerController {
    
    private final BannerService bannerService;
    
    /**
     * Get all banners (admin view - including inactive)
     */
    @GetMapping
    public ResponseEntity<List<BannerDto>> getAllBanners() {
        log.info("ADMIN: Fetching all banners");
        return ResponseEntity.ok(bannerService.getAllBanners());
    }
    
    /**
     * Get banner by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<BannerDto> getBannerById(@PathVariable Long id) {
        log.info("ADMIN: Fetching banner by id: {}", id);
        return ResponseEntity.ok(bannerService.getBannerById(id));
    }
    
    /**
     * Create new banner
     */
    @PostMapping
    public ResponseEntity<BannerDto> createBanner(@RequestBody Banner banner) {
        log.info("ADMIN: Creating new banner with title: {}", banner.getTitle());
        BannerDto created = bannerService.createBanner(banner);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    
    /**
     * Update banner
     */
    @PutMapping("/{id}")
    public ResponseEntity<BannerDto> updateBanner(
            @PathVariable Long id,
            @RequestBody Banner bannerDetails) {
        log.info("ADMIN: Updating banner with id: {}", id);
        BannerDto updated = bannerService.updateBanner(id, bannerDetails);
        return ResponseEntity.ok(updated);
    }
    
    /**
     * Toggle banner active/inactive status
     */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<BannerDto> toggleBannerStatus(@PathVariable Long id) {
        log.info("ADMIN: Toggling banner status for id: {}", id);
        BannerDto updated = bannerService.toggleBannerStatus(id);
        return ResponseEntity.ok(updated);
    }
    
    /**
     * Delete banner
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBanner(@PathVariable Long id) {
        log.info("ADMIN: Deleting banner with id: {}", id);
        bannerService.deleteBanner(id);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Reorder banners by updating display order
     */
    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorderBanners(@RequestBody List<Map<String, Object>> reorderData) {
        log.info("ADMIN: Reordering {} banners", reorderData.size());
        for (Map<String, Object> item : reorderData) {
            Long bannerId = Long.valueOf(item.get("id").toString());
            Integer order = Integer.valueOf(item.get("displayOrder").toString());
            Banner banner = new Banner();
            banner.setDisplayOrder(order);
            bannerService.updateBanner(bannerId, banner);
        }
        return ResponseEntity.ok().build();
    }
}

package com.khanago.grocery.banner;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/banners")
@RequiredArgsConstructor
public class BannerController {
    
    private final BannerService bannerService;
    
    /**
     * Get all active banners (public - for ionic app)
     */
    @GetMapping
    public ResponseEntity<List<BannerDto>> getActiveBanners() {
        log.debug("GET /api/v1/banners - Fetching active banners");
        List<BannerDto> banners = bannerService.getActiveBanners();
        return ResponseEntity.ok(banners);
    }
}

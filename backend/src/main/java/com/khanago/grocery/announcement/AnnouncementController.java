package com.khanago.grocery.announcement;

import com.khanago.grocery.common.service.FcmService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementRepository repo;
    private final FcmService fcmService;

    /** Public — called by the Ionic app on every home load */
    @GetMapping("/api/public/announcement")
    public Announcement get() {
        return repo.findById(1L).orElseGet(Announcement::new);
    }

    /** Admin only — save/update the announcement */
    @PutMapping("/api/admin/announcement")
    public Announcement update(@RequestBody Map<String, Object> body) {
        Announcement a = repo.findById(1L).orElseGet(Announcement::new);
        a.setId(1L);
        boolean wasActive = a.isActive();
        if (body.containsKey("message"))  a.setMessage((String) body.get("message"));
        if (body.containsKey("active"))   a.setActive((Boolean) body.get("active"));
        if (body.containsKey("bgColor"))  a.setBgColor((String) body.get("bgColor"));
        Announcement saved = repo.save(a);
        // Broadcast push notification when announcement is newly activated
        boolean isNowActive = saved.isActive();
        if (!wasActive && isNowActive && saved.getMessage() != null && !saved.getMessage().isBlank()) {
            fcmService.sendToTopic("promotions", "Order Kro Offer", saved.getMessage());
        }
        return saved;
    }
}

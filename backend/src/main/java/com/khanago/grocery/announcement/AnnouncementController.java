package com.khanago.grocery.announcement;

import com.khanago.grocery.common.enums.RoleName;
import com.khanago.grocery.common.service.FcmService;
import com.khanago.grocery.notification.UserNotificationService;
import com.khanago.grocery.user.User;
import com.khanago.grocery.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementRepository repo;
    private final FcmService fcmService;
    private final UserNotificationService userNotificationService;
    private final UserRepository userRepository;

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
        if (body.containsKey("imageUrl")) a.setImageUrl((String) body.get("imageUrl"));
        Announcement saved = repo.save(a);
        // Broadcast push + in-app notification when announcement is newly activated
        boolean isNowActive = saved.isActive();
        if (!wasActive && isNowActive && saved.getMessage() != null && !saved.getMessage().isBlank()) {
            fcmService.sendToTopic("promotions", "🛍️ Order Kro", saved.getMessage(), saved.getImageUrl());
            broadcastInAppNotification("🛍️ Order Kro", saved.getMessage(), saved.getImageUrl());
        }
        return saved;
    }

    /**
     * Admin only — re-send the current announcement as a push notification to all users
     * without touching the banner's active/inactive state.
     */
    @PostMapping("/api/admin/announcement/push")
    public Map<String, String> sendPush() {
        Announcement a = repo.findById(1L).orElseGet(Announcement::new);
        String msg = a.getMessage();
        if (msg == null || msg.isBlank()) {
            return Map.of("status", "skipped", "reason", "No announcement message set.");
        }
        fcmService.sendToTopic("promotions", "🛍️ Order Kro", msg, a.getImageUrl());
        broadcastInAppNotification("🛍️ Order Kro", msg, a.getImageUrl());
        return Map.of("status", "sent");
    }

    /** Save a UserNotification row for every customer so the bell icon shows a count. */
    private void broadcastInAppNotification(String title, String body, String imageUrl) {
        List<User> customers = userRepository.findByRoles_Name(RoleName.CUSTOMER);
        for (User customer : customers) {
            userNotificationService.save(customer, title, body, "PROMO", imageUrl);
        }
    }
}

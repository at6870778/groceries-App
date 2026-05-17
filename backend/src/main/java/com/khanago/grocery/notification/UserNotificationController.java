package com.khanago.grocery.notification;

import com.khanago.grocery.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer/notifications")
@RequiredArgsConstructor
public class UserNotificationController {

    private final UserNotificationService service;

    @GetMapping
    public List<NotificationDto> list() {
        Long userId = SecurityUtils.getCurrentUserId();
        return service.getForUser(userId).stream().map(this::toDto).toList();
    }

    @GetMapping("/count")
    public Map<String, Long> count() {
        Long userId = SecurityUtils.getCurrentUserId();
        return Map.of("count", service.countNew(userId));
    }

    /** Tap a notification → delete it immediately */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOne(@PathVariable Long id) {
        service.deleteOne(id, SecurityUtils.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    /** Clear all notifications */
    @DeleteMapping
    public ResponseEntity<Void> deleteAll() {
        service.deleteAll(SecurityUtils.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    private NotificationDto toDto(UserNotification n) {
        return new NotificationDto(
                n.getId(),
                n.getTitle(),
                n.getBody(),
                n.getType(),
            n.getImageUrl(),
                n.getCreatedAt()
        );
    }

    public record NotificationDto(
            Long id,
            String title,
            String body,
            String type,
            String imageUrl,
            Instant createdAt
    ) {}
}

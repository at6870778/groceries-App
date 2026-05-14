package com.khanago.grocery.notification;

import com.khanago.grocery.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
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

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        Long userId = SecurityUtils.getCurrentUserId();
        return Map.of("count", service.countUnread(userId));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        service.markRead(id, SecurityUtils.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead() {
        service.markAllRead(SecurityUtils.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    private NotificationDto toDto(UserNotification n) {
        return new NotificationDto(
                n.getId(),
                n.getTitle(),
                n.getBody(),
                n.getType(),
                n.isRead(),
                n.getCreatedAt()
        );
    }

    public record NotificationDto(
            Long id,
            String title,
            String body,
            String type,
            boolean read,
            LocalDateTime createdAt
    ) {}
}

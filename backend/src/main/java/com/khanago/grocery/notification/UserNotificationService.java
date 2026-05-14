package com.khanago.grocery.notification;

import com.khanago.grocery.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserNotificationService {

    private final UserNotificationRepository repository;

    /** Save a notification for a user (called alongside FCM send). */
    public void save(User user, String title, String body, String type) {
        if (user == null) return;
        UserNotification n = new UserNotification();
        n.setUser(user);
        n.setTitle(title);
        n.setBody(body);
        n.setType(type);
        repository.save(n);
    }

    public List<UserNotification> getForUser(Long userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long countUnread(Long userId) {
        return repository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markRead(Long notificationId, Long userId) {
        repository.findById(notificationId).ifPresent(n -> {
            if (n.getUser().getId().equals(userId)) {
                n.setRead(true);
                repository.save(n);
            }
        });
    }

    @Transactional
    public void markAllRead(Long userId) {
        repository.markAllReadByUserId(userId);
    }
}

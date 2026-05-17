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
        save(user, title, body, type, null);
    }

    /** Save a notification for a user (called alongside FCM send). */
    public void save(User user, String title, String body, String type, String imageUrl) {
        if (user == null) return;
        UserNotification n = new UserNotification();
        n.setUser(user);
        n.setTitle(title);
        n.setBody(body);
        n.setType(type);
        n.setImageUrl(imageUrl);
        repository.save(n);
    }

    public List<UserNotification> getForUser(Long userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long countNew(Long userId) {
        return repository.countByUserId(userId);
    }

    /** Delete a single notification when user taps it. */
    @Transactional
    public void deleteOne(Long notificationId, Long userId) {
        repository.findById(notificationId).ifPresent(n -> {
            if (n.getUser().getId().equals(userId)) {
                repository.delete(n);
            }
        });
    }

    /** Delete all notifications for user (clear all). */
    @Transactional
    public void deleteAll(Long userId) {
        repository.deleteAllByUserId(userId);
    }
}

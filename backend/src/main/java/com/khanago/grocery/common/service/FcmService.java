package com.khanago.grocery.common.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sends Firebase Cloud Messaging push notifications.
 * All methods are @Async — they fire-and-forget on the async executor.
 */
@Slf4j
@Service
public class FcmService {

    private boolean isAvailable() {
        return !FirebaseApp.getApps().isEmpty();
    }

    /**
     * Send a notification to a single device token.
     * @param imageUrl optional HTTPS URL of image to show in the notification (can be null)
     */
    @Async
    public void sendToToken(String token, String title, String body, String clickAction, String imageUrl) {
        if (!isAvailable() || token == null || token.isBlank()) return;
        try {
            Notification.Builder notifBuilder = Notification.builder()
                    .setTitle(title)
                    .setBody(body);
            if (imageUrl != null && !imageUrl.isBlank()) notifBuilder.setImage(imageUrl);

            AndroidNotification.Builder androidNotifBuilder = AndroidNotification.builder()
                    .setChannelId("khanago_orders")
                    .setSound("default")
                    .setDefaultVibrateTimings(true)
                    .setDefaultLightSettings(true);
            if (imageUrl != null && !imageUrl.isBlank()) androidNotifBuilder.setImage(imageUrl);

            Message message = Message.builder()
                    .setToken(token)
                    .setNotification(notifBuilder.build())
                    .putData("click_action", clickAction != null ? clickAction : "")
                    .setAndroidConfig(AndroidConfig.builder()
                            .setPriority(AndroidConfig.Priority.HIGH)
                            .setNotification(androidNotifBuilder.build())
                            .build())
                    .build();
            String response = FirebaseMessaging.getInstance().send(message);
            log.debug("FCM token send response: {}", response);
        } catch (FirebaseMessagingException e) {
            log.warn("FCM send to token failed: {}", e.getMessage());
        }
    }

    /** Convenience overload — no image. */
    @Async
    public void sendToToken(String token, String title, String body, String clickAction) {
        sendToToken(token, title, body, clickAction, null);
    }

    /**
     * Send a notification to all subscribers of a topic (e.g. "promotions").
     * @param imageUrl optional HTTPS URL of image to show in the notification (can be null)
     */
    @Async
    public void sendToTopic(String topic, String title, String body, String imageUrl) {
        if (!isAvailable()) return;
        try {
            Notification.Builder notifBuilder = Notification.builder()
                    .setTitle(title)
                    .setBody(body);
            if (imageUrl != null && !imageUrl.isBlank()) notifBuilder.setImage(imageUrl);

            AndroidNotification.Builder androidNotifBuilder = AndroidNotification.builder()
                    .setChannelId("khanago_promos")
                    .setSound("default");
            if (imageUrl != null && !imageUrl.isBlank()) androidNotifBuilder.setImage(imageUrl);

            Message message = Message.builder()
                    .setTopic(topic)
                    .setNotification(notifBuilder.build())
                    .putData("click_action", "OPEN_PROMOTIONS")
                    .putData("imageUrl", imageUrl != null ? imageUrl : "")
                    .setAndroidConfig(AndroidConfig.builder()
                        .setPriority(AndroidConfig.Priority.HIGH)
                            .setNotification(androidNotifBuilder.build())
                            .build())
                    .build();
            String response = FirebaseMessaging.getInstance().send(message);
            log.debug("FCM topic send response: {}", response);
        } catch (FirebaseMessagingException e) {
            log.warn("FCM send to topic failed: {}", e.getMessage());
        }
    }

    /** Convenience overload — no image. */
    @Async
    public void sendToTopic(String topic, String title, String body) {
        sendToTopic(topic, title, body, null);
    }

    /**
     * Subscribe a device token to a topic.
     */
    public void subscribeToTopic(String token, String topic) {
        if (!isAvailable() || token == null || token.isBlank()) return;
        try {
            TopicManagementResponse resp = FirebaseMessaging.getInstance()
                    .subscribeToTopic(java.util.List.of(token), topic);
            log.debug("FCM subscribe to topic '{}': {} success, {} failure", topic,
                    resp.getSuccessCount(), resp.getFailureCount());
        } catch (FirebaseMessagingException e) {
            log.warn("FCM subscribe to topic failed: {}", e.getMessage());
        }
    }
}

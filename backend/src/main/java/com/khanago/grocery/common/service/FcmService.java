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
     */
    @Async
    public void sendToToken(String token, String title, String body, String clickAction) {
        if (!isAvailable() || token == null || token.isBlank()) return;
        try {
            Message message = Message.builder()
                    .setToken(token)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putData("click_action", clickAction != null ? clickAction : "")
                    .setAndroidConfig(AndroidConfig.builder()
                            .setPriority(AndroidConfig.Priority.HIGH)
                            .setNotification(AndroidNotification.builder()
                                    .setChannelId("khanago_orders")
                                    .setSound("default")
                                    .build())
                            .build())
                    .build();
            String response = FirebaseMessaging.getInstance().send(message);
            log.debug("FCM token send response: {}", response);
        } catch (FirebaseMessagingException e) {
            log.warn("FCM send to token failed: {}", e.getMessage());
        }
    }

    /**
     * Send a notification to all subscribers of a topic (e.g. "promotions").
     */
    @Async
    public void sendToTopic(String topic, String title, String body) {
        if (!isAvailable()) return;
        try {
            Message message = Message.builder()
                    .setTopic(topic)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putData("click_action", "OPEN_PROMOTIONS")
                    .setAndroidConfig(AndroidConfig.builder()
                            .setPriority(AndroidConfig.Priority.NORMAL)
                            .setNotification(AndroidNotification.builder()
                                    .setChannelId("khanago_promos")
                                    .setSound("default")
                                    .build())
                            .build())
                    .build();
            String response = FirebaseMessaging.getInstance().send(message);
            log.debug("FCM topic send response: {}", response);
        } catch (FirebaseMessagingException e) {
            log.warn("FCM send to topic failed: {}", e.getMessage());
        }
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

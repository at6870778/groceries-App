package com.khanago.grocery.common.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Sends Firebase Cloud Messaging push notifications with image support.
 * All methods are @Async — they fire-and-forget on the async executor.
 * 
 * Image handling:
 * - Android: Images display as large notifications in system tray
 * - iOS: Images display in push notification through APNs
 * - Requires: HTTPS URLs, valid image format, accessible from public internet
 */
@Slf4j
@Service
public class FcmService {

    private boolean isAvailable() {
        return !FirebaseApp.getApps().isEmpty();
    }

    /**
     * Validate and normalize image URLs for push notifications.
     * Firebase requires HTTPS URLs that are publicly accessible.
     */
    private String validateImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return null;
        
        // Trim whitespace
        imageUrl = imageUrl.trim();
        
        // Check if it's a valid HTTPS URL
        if (!imageUrl.startsWith("https://")) {
            log.warn("Image URL is not HTTPS, rejecting for safety: {}", imageUrl);
            return null;
        }
        
        // Ensure URL length is within Firebase limits (~2048 chars)
        if (imageUrl.length() > 2000) {
            log.warn("Image URL too long ({}), rejecting", imageUrl.length());
            return null;
        }
        
        return imageUrl;
    }

    /**
     * Send a notification to a single device token.
     * @param imageUrl optional HTTPS URL of image to show in the notification (can be null)
     */
    @Async
    public void sendToToken(String token, String title, String body, String clickAction, String imageUrl) {
        if (!isAvailable() || token == null || token.isBlank()) return;
        try {
            String validatedImageUrl = validateImageUrl(imageUrl);
            
            Notification.Builder notifBuilder = Notification.builder()
                    .setTitle(title)
                    .setBody(body);
            if (validatedImageUrl != null) notifBuilder.setImage(validatedImageUrl);

            AndroidNotification.Builder androidNotifBuilder = AndroidNotification.builder()
                    .setChannelId("khanago_orders")
                    .setSound("default")
                    .setDefaultVibrateTimings(true)
                    .setDefaultLightSettings(true)
                    .setColor("#FF5722")  // OrderKro brand color
                    .setClickAction(clickAction);
            
            if (validatedImageUrl != null) {
                // Set image for BigPictureStyle
                androidNotifBuilder.setImage(validatedImageUrl);
                log.debug("Added image to Android notification: {}", validatedImageUrl);
            }

            Message.Builder messageBuilder = Message.builder()
                    .setToken(token)
                    .setNotification(notifBuilder.build())
                    .putData("click_action", clickAction != null ? clickAction : "");
            
            // Add image to data payload for client-side handling
            if (validatedImageUrl != null) {
                messageBuilder.putData("imageUrl", validatedImageUrl);
                messageBuilder.putData("bigPictureUrl", validatedImageUrl);
            }
            
            Message message = messageBuilder
                    .setAndroidConfig(AndroidConfig.builder()
                            .setPriority(AndroidConfig.Priority.HIGH)
                            .setNotification(androidNotifBuilder.build())
                            .build())
                    // APNs config for iOS — ensures image displays on lock screen/notification center
                    .setApnsConfig(ApnsConfig.builder()
                            .setAps(Aps.builder()
                                    .setSound("default")
                                    .setMutableContent(true)  // Allows image download before display
                                    .setAlert(ApsAlert.builder()
                                            .setTitle(title)
                                            .setBody(body)
                                            .build())
                                    .build())
                            .putCustomData("imageUrl", validatedImageUrl != null ? validatedImageUrl : "")
                            .putCustomData("bigPictureUrl", validatedImageUrl != null ? validatedImageUrl : "")
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
     * Sends BOTH notification + data payloads:
     * - Notification payload: Shows system notification when app is background/killed
     * - Data payload: Allows app to intercept in foreground and update bell counter
     * @param imageUrl optional HTTPS URL of image to show in the notification (can be null)
     */
    @Async
    public void sendToTopic(String topic, String title, String body, String imageUrl) {
        if (!isAvailable()) return;
        try {
            String validatedImageUrl = validateImageUrl(imageUrl);
            
            // ✅ Notification payload: System notification (background/killed)
            Notification.Builder notifBuilder = Notification.builder()
                    .setTitle(title)
                    .setBody(body);
            if (validatedImageUrl != null) notifBuilder.setImage(validatedImageUrl);

            // ✅ Android config with BigPictureStyle
            AndroidNotification.Builder androidNotifBuilder = AndroidNotification.builder()
                    .setChannelId("khanago_promos")
                    .setSound("default")
                    .setDefaultVibrateTimings(true)
                    .setDefaultLightSettings(true)
                    .setColor("#FF5722")
                    .setClickAction("OPEN_PROMOTIONS");
            
            if (validatedImageUrl != null) {
                androidNotifBuilder.setImage(validatedImageUrl);
                log.debug("Added image to Android notification: {}", validatedImageUrl);
            }

            Message.Builder messageBuilder = Message.builder()
                    .setTopic(topic)
                    .setNotification(notifBuilder.build())  // System notification payload
                    // ✅ Data payload: App receives in foreground listener
                    .putData("title", title)
                    .putData("body", body)
                    .putData("click_action", "OPEN_PROMOTIONS")
                    .putData("type", "PROMO");
            
            // Add image to data payload for client-side handling
            if (validatedImageUrl != null) {
                messageBuilder.putData("imageUrl", validatedImageUrl);
                messageBuilder.putData("bigPictureUrl", validatedImageUrl);
            }
            
            Message message = messageBuilder
                    .setAndroidConfig(AndroidConfig.builder()
                            .setPriority(AndroidConfig.Priority.HIGH)
                            .setNotification(androidNotifBuilder.build())
                            .build())
                    // APNs config for iOS — ensures image displays on lock screen/notification center
                    .setApnsConfig(ApnsConfig.builder()
                            .setAps(Aps.builder()
                                    .setSound("default")
                                    .setMutableContent(true)  // Allows image download before display
                                    .setContentAvailable(true)  // Wakes app in background
                                    .setAlert(ApsAlert.builder()
                                            .setTitle(title)
                                            .setBody(body)
                                            .build())
                                    .build())
                            .putCustomData("imageUrl", validatedImageUrl != null ? validatedImageUrl : "")
                            .putCustomData("bigPictureUrl", validatedImageUrl != null ? validatedImageUrl : "")
                            .build())
                    .build();
            
            String response = FirebaseMessaging.getInstance().send(message);
            log.debug("FCM topic send response for topic '{}': {}", topic, response);
        } catch (FirebaseMessagingException e) {
            log.warn("FCM send to topic '{}' failed: {}", topic, e.getMessage());
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

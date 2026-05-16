package com.khanago.grocery.common.service;

import com.khanago.grocery.config.AppProperties;
import com.khanago.grocery.order.dto.OrderDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Sends admin notifications when key business events occur (new order, etc.).
 *
 * Notification channel: Telegram Bot
 *   - Zero cost, no DND restrictions, instant delivery to admin's phone.
 *   - Setup: create a bot via @BotFather, get token + chat ID, set env vars:
 *       TELEGRAM_BOT_TOKEN  – e.g. 123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ
 *       TELEGRAM_CHAT_ID    – your personal / group chat ID (use @userinfobot to find it)
 *
 * Falls back to console log when not configured (dev-safe).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminNotificationService {

    private static final String TELEGRAM_API = "https://api.telegram.org";

    private final AppProperties appProperties;
    private final RestClient.Builder restClientBuilder;

    /**
     * Fired asynchronously after a customer places a new order so it never
     * delays the checkout response.
     */
    @Async
    public void notifyNewOrder(OrderDto order) {
        AppProperties.Telegram tg = appProperties.getTelegram();

        if (!tg.isConfigured()) {
            log.info("[NOTIFY] New order #{} by {} – ₹{} (Telegram not configured, skipping)",
                    order.id(), order.customerName(), order.totalAmount());
            return;
        }

        String text = buildOrderMessage(order);
        sendTelegram(tg.getBotToken(), tg.getChatId(), text);
    }

    /**
     * Sent to the delivery boy's personal Telegram chat when they are assigned an order.
     * Uses a separate per-rider chatId stored on the User entity (telegramChatId).
     */
    @Async
    public void notifyDeliveryBoyAssigned(OrderDto order, String deliveryBoyName, String deliveryBoyTelegramChatId) {
        AppProperties.Telegram tg = appProperties.getTelegram();
        if (!tg.isConfigured()) return;

        // Always notify the admin group/chat as well
        String adminText = "🛵 *Rider Assigned*\n\n" +
                "📦 Order #" + order.id() + " assigned to *" + escape(deliveryBoyName) + "*\n" +
                "👤 Customer: " + escape(order.customerName()) + "\n" +
                "📞 Phone: " + escape(order.customerPhone()) + "\n" +
            "📍 Address: " + escape(resolveAddressLine(order)) + "\n" +
                formatVillageLandmark(order.notes()) +
                "💳 Payment: " + order.paymentMode() + "\n" +
                "💰 Total: ₹" + order.totalAmount();
        sendTelegram(tg.getBotToken(), tg.getChatId(), adminText);

        // Notify the delivery boy if they have a personal Telegram chat ID configured
        if (deliveryBoyTelegramChatId != null && !deliveryBoyTelegramChatId.isBlank()) {
            StringBuilder sb = new StringBuilder();
            sb.append("📦 *New Delivery Assigned to You!*\n\n");
            sb.append("🆔 Order #").append(order.id()).append("\n");
            sb.append("👤 Customer: ").append(escape(order.customerName())).append("\n");
            sb.append("📞 Phone: ").append(escape(order.customerPhone())).append("\n");
            sb.append("📍 Address: ").append(escape(resolveAddressLine(order))).append("\n");
            sb.append(formatVillageLandmark(order.notes()));
            if (order.items() != null && !order.items().isEmpty()) {
                sb.append("\n*Items:*\n");
                order.items().forEach(item ->
                    sb.append("  • ").append(escape(item.productName()))
                      .append(" × ").append(item.quantity())
                      .append(" @ ₹").append(item.unitPrice()).append("\n")
                );
            }
            sb.append("💳 Payment: ").append(order.paymentMode()).append("\n");
            sb.append("💰 Collect: ₹").append(order.totalAmount()).append("\n");
            sb.append("\n✅ Please pick up and deliver at the earliest!");
            sendTelegram(tg.getBotToken(), deliveryBoyTelegramChatId, sb.toString());
        }
    }

    /**
     * Fired when delivery boy marks the order as DELIVERED.
     */
    @Async
    public void notifyOrderDelivered(OrderDto order, String deliveryBoyName) {
        AppProperties.Telegram tg = appProperties.getTelegram();
        if (!tg.isConfigured()) {
            log.info("[NOTIFY] Order #{} delivered by {} (Telegram not configured, skipping)", order.id(), deliveryBoyName);
            return;
        }

        String text = "✅ *Order Delivered!*\n\n" +
                "📦 Order #" + order.id() + "\n" +
                "👤 Customer: " + escape(order.customerName()) + "\n" +
                "📞 Phone: " + escape(order.customerPhone()) + "\n" +
            "📍 Address: " + escape(resolveAddressLine(order)) + "\n" +
                formatVillageLandmark(order.notes()) +
            "🛵 Delivered by: " + escape(deliveryBoyName) + "\n" +
                "💰 Amount: ₹" + order.totalAmount() + "\n" +
                "💳 Payment: " + order.paymentMode() + "\n\n" +
                "🎉 Order completed successfully!";
        sendTelegram(tg.getBotToken(), tg.getChatId(), text);
    }

    /**
     * Fired when delivery boy marks the order as PICKED.
     */
    @Async
    public void notifyOrderPicked(OrderDto order, String deliveryBoyName) {
        AppProperties.Telegram tg = appProperties.getTelegram();
        if (!tg.isConfigured()) {
            log.info("[NOTIFY] Order #{} picked by {} (Telegram not configured, skipping)", order.id(), deliveryBoyName);
            return;
        }

        String text = "📦 *Order Picked!*\n\n" +
                "📦 Order #" + order.id() + "\n" +
                "👤 Customer: " + escape(order.customerName()) + "\n" +
                "📞 Phone: " + escape(order.customerPhone()) + "\n" +
            "📍 Address: " + escape(resolveAddressLine(order)) + "\n" +
                formatVillageLandmark(order.notes()) +
                "🛵 Picked by: " + escape(deliveryBoyName) + "\n" +
                "💰 Amount: ₹" + order.totalAmount();
        sendTelegram(tg.getBotToken(), tg.getChatId(), text);
    }

    /**
     * Fired when delivery boy marks the order as OUT_FOR_DELIVERY.
     */
    @Async
    public void notifyOrderOutForDelivery(OrderDto order, String deliveryBoyName) {
        AppProperties.Telegram tg = appProperties.getTelegram();
        if (!tg.isConfigured()) {
            log.info("[NOTIFY] Order #{} out for delivery by {} (Telegram not configured, skipping)", order.id(), deliveryBoyName);
            return;
        }

        String text = "🚴 *Order Out For Delivery!*\n\n" +
                "📦 Order #" + order.id() + "\n" +
                "👤 Customer: " + escape(order.customerName()) + "\n" +
                "📞 Phone: " + escape(order.customerPhone()) + "\n" +
            "📍 Address: " + escape(resolveAddressLine(order)) + "\n" +
                formatVillageLandmark(order.notes()) +
                "🛵 Rider: " + escape(deliveryBoyName) + "\n" +
                "💰 Amount: ₹" + order.totalAmount() + "\n\n" +
                "⏱️ Estimated delivery: 15-20 minutes";
        sendTelegram(tg.getBotToken(), tg.getChatId(), text);
    }

    private String buildOrderMessage(OrderDto order) {
        StringBuilder sb = new StringBuilder();
        sb.append("🛒 *New Order Received!*\n\n");
        sb.append("📦 Order #").append(order.id()).append("\n");
        sb.append("👤 Customer: ").append(escape(order.customerName())).append("\n");
        sb.append("📞 Phone: ").append(escape(order.customerPhone())).append("\n");
        sb.append("📍 Address: ").append(escape(resolveAddressLine(order))).append("\n");
        sb.append(formatVillageLandmark(order.notes()));
        sb.append("💳 Payment: ").append(order.paymentMode()).append("\n");
        sb.append("💰 Total: ₹").append(order.totalAmount()).append("\n");

        if (order.items() != null && !order.items().isEmpty()) {
            sb.append("\n*Items:*\n");
            order.items().forEach(item ->
                sb.append("  • ").append(escape(item.productName()))
                  .append(" × ").append(item.quantity())
                  .append(" @ ₹").append(item.unitPrice()).append("\n")
            );
        }

        sb.append("\n👉 Open admin panel to assign a rider.");
        return sb.toString();
    }

    /**
     * Extracts Village/Area and Landmark from checkout notes
     * (format: "Deliver fast | Village/Area: X | Landmark: Y")
     * and returns them as formatted Telegram lines, or empty string if none found.
     */
    private String formatVillageLandmark(String notes) {
        if (notes == null || notes.isBlank()) return "";
        StringBuilder result = new StringBuilder();
        java.util.regex.Matcher villageMatcher = java.util.regex.Pattern
                .compile("Village/Area:\\s*([^|]+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(notes);
        if (villageMatcher.find()) {
            result.append("🏘 Village/Area: ").append(escape(villageMatcher.group(1).trim())).append("\n");
        }
        java.util.regex.Matcher landmarkMatcher = java.util.regex.Pattern
                .compile("Landmark:\\s*([^|]+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(notes);
        if (landmarkMatcher.find()) {
            result.append("🏠 Landmark: ").append(escape(landmarkMatcher.group(1).trim())).append("\n");
        }
        return result.toString();
    }

    private String resolveAddressLine(OrderDto order) {
        String address = order.deliveryAddress();
        if (address != null && !address.isBlank() && !"N/A".equalsIgnoreCase(address.trim())) {
            return address;
        }

        String notes = order.notes();
        if (notes == null || notes.isBlank()) {
            return "Address not available";
        }

        String village = "";
        String landmark = "";
        String detectedAddress = "";

        java.util.regex.Matcher detectedMatcher = java.util.regex.Pattern
                .compile("Detected Location:\\s*([^|]+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(notes);
        if (detectedMatcher.find()) {
            detectedAddress = detectedMatcher.group(1).trim();
        }

        if (!detectedAddress.isBlank()) {
            return detectedAddress;
        }

        java.util.regex.Matcher villageMatcher = java.util.regex.Pattern
                .compile("Village/Area:\\s*([^|]+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(notes);
        if (villageMatcher.find()) {
            village = villageMatcher.group(1).trim();
        }

        java.util.regex.Matcher landmarkMatcher = java.util.regex.Pattern
                .compile("Landmark:\\s*([^|]+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(notes);
        if (landmarkMatcher.find()) {
            landmark = landmarkMatcher.group(1).trim();
        }

        if (!village.isBlank() && !landmark.isBlank()) {
            return village + ", Near: " + landmark;
        }
        if (!village.isBlank()) {
            return village;
        }
        if (!landmark.isBlank()) {
            return "Near: " + landmark;
        }

        return "Address not available";
    }

    private void sendTelegram(String botToken, String chatId, String text) {
        try {
            RestClient client = restClientBuilder.baseUrl(TELEGRAM_API).build();
            Map<String, String> body = Map.of(
                    "chat_id", chatId,
                    "text", text,
                    "parse_mode", "Markdown"
            );
            String response = client.post()
                    .uri("/bot{token}/sendMessage", botToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            log.info("[NOTIFY] Telegram message sent for new order. Response: {}", response);
        } catch (Exception ex) {
            // Notification failure must never affect the order flow
            log.error("[NOTIFY] Failed to send Telegram notification: {}", ex.getMessage());
        }
    }

    /** Escapes Markdown special characters for Telegram. */
    private String escape(String s) {
        if (s == null) return "";
        return s.replace("_", "\\_").replace("*", "\\*").replace("[", "\\[").replace("`", "\\`");
    }
}

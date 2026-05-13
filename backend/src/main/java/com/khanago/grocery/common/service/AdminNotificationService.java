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

    private String buildOrderMessage(OrderDto order) {
        StringBuilder sb = new StringBuilder();
        sb.append("🛒 *New Order Received!*\n\n");
        sb.append("📦 Order #").append(order.id()).append("\n");
        sb.append("👤 Customer: ").append(escape(order.customerName())).append("\n");
        sb.append("📞 Phone: ").append(escape(order.customerPhone())).append("\n");
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

        if (order.notes() != null && !order.notes().isBlank()) {
            sb.append("\n📝 Note: ").append(escape(order.notes())).append("\n");
        }

        sb.append("\n👉 Open admin panel to assign a rider.");
        return sb.toString();
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

package com.khanago.grocery.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Jwt jwt = new Jwt();
    private Auth auth = new Auth();
    private Cors cors = new Cors();
    private Razorpay razorpay = new Razorpay();
    private Msg91 msg91 = new Msg91();
    private Cloudinary cloudinary = new Cloudinary();
    private Telegram telegram = new Telegram();

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
        private long expiryMinutes;
        private long refreshExpiryDays;
    }

    @Getter
    @Setter
    public static class Auth {
        private boolean acceptAnyOtp;
        private String staticOtp = "123456";
    }

    @Getter
    @Setter
    public static class Cors {
        private String allowedOrigins;
    }

    @Getter
    @Setter
    public static class Razorpay {
        private String keyId;
        private String keySecret;
    }

    @Getter
    @Setter
    public static class Msg91 {
        private String authKey;
        private String tokenAuth;
        private String widgetId;
        private String templateId;
        private String senderId = "KHNAGO";
        private String countryCode = "91";
        private boolean trustAllSsl;

        /** True only when an auth key has actually been configured. */
        public boolean isEnabled() {
            return authKey != null && !authKey.isBlank();
        }

        public boolean isWidgetEnabled() {
            return isEnabled() && widgetId != null && !widgetId.isBlank();
        }
    }

    @Getter
    @Setter
    public static class Cloudinary {
        private String cloudName;
        private String apiKey;
        private String apiSecret;

        public boolean isConfigured() {
            return cloudName != null && !cloudName.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && apiSecret != null && !apiSecret.isBlank();
        }
    }

    @Getter
    @Setter
    public static class Telegram {
        private String botToken;
        private String chatId;

        /** True only when both token and chat ID are set. */
        public boolean isConfigured() {
            return botToken != null && !botToken.isBlank()
                    && chatId != null && !chatId.isBlank();
        }
    }

    @Getter
    @Setter
    public static class Firebase {
        /** Path to the service account JSON file (or classpath resource). */
        private String serviceAccountPath;

        public boolean isConfigured() {
            return serviceAccountPath != null && !serviceAccountPath.isBlank();
        }
    }

    private Firebase firebase = new Firebase();
}

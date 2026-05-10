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
        private String templateId;
        private String senderId = "KHNAGO";
        private String countryCode = "91";
        private boolean trustAllSsl;

        /** True only when an auth key has actually been configured. */
        public boolean isEnabled() {
            return authKey != null && !authKey.isBlank();
        }
    }
}

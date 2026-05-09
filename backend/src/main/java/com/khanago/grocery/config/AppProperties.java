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
    private Cors cors = new Cors();
    private Razorpay razorpay = new Razorpay();

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
        private long expiryMinutes;
        private long refreshExpiryDays;
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
}

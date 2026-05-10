package com.khanago.grocery.auth.service;

import com.khanago.grocery.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.net.http.HttpClient;
import java.util.Locale;
import java.util.Map;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;

/**
 * Sends OTP SMS via MSG91 REST API (v5).
 *
 * To activate, set the following environment variables:
 *   MSG91_AUTH_KEY   – your MSG91 Auth Key
 *   MSG91_TEMPLATE_ID – the MSG91 template ID containing ##OTP## placeholder
 *
 * When MSG91_AUTH_KEY is blank (local / CI), the service logs the OTP to console
 * instead of making a real network call (dev-safe fallback).
 */
@Slf4j
@Service
public class Msg91SmsService {

    private final AppProperties appProperties;
    private final RestClient restClient;

    public Msg91SmsService(AppProperties appProperties, RestClient.Builder restClientBuilder) {
        this.appProperties = appProperties;
        this.restClient = createRestClient(restClientBuilder, appProperties.getMsg91().isTrustAllSsl());
    }

    private RestClient createRestClient(RestClient.Builder restClientBuilder, boolean trustAllSsl) {
        if (!trustAllSsl) {
            return restClientBuilder.baseUrl("https://control.msg91.com").build();
        }

        try {
            TrustManager[] trustAllCerts = new TrustManager[]{new X509TrustManager() {
                @Override
                public void checkClientTrusted(X509Certificate[] chain, String authType) {
                }

                @Override
                public void checkServerTrusted(X509Certificate[] chain, String authType) {
                }

                @Override
                public X509Certificate[] getAcceptedIssuers() {
                    return new X509Certificate[0];
                }
            }};

            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAllCerts, new SecureRandom());

            HttpClient httpClient = HttpClient.newBuilder()
                    .sslContext(sslContext)
                    .build();

            log.warn("MSG91 dev client is using trust-all SSL. Do not enable this in production.");
            return restClientBuilder
                    .baseUrl("https://control.msg91.com")
                    .requestFactory(new JdkClientHttpRequestFactory(httpClient))
                    .build();
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to create MSG91 HTTP client.", ex);
        }
    }

    /**
     * Sends {@code otp} to the given 10-digit Indian mobile number via MSG91.
     * Falls back to console log when MSG91 is not configured.
     */
    public void sendOtp(String phone, String otp) {
        AppProperties.Msg91 cfg = appProperties.getMsg91();
        String fullPhone = cfg.getCountryCode() + phone;

        if (!cfg.isEnabled()) {
            log.warn("[DEV-ONLY] MSG91 not configured – OTP for {} is: {}", phone, otp);
            return;
        }

        try {
            Map<String, String> body = Map.of(
                    "template_id", cfg.getTemplateId(),
                    "mobile", fullPhone,
                    "otp", otp
            );

            String responseBody = restClient.post()
                    .uri("/api/v5/otp")
                    .header("authkey", cfg.getAuthKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            if (responseBody == null || !looksSuccessful(responseBody)) {
                log.error("MSG91 OTP request for +{} returned non-success body: {}", fullPhone, responseBody);
                throw new RuntimeException("Unable to send OTP. MSG91 did not confirm delivery.");
            }

            log.info("OTP dispatched via MSG91 to +{} with response: {}", fullPhone, responseBody);
        } catch (RestClientResponseException ex) {
            log.error("MSG91 OTP send failed for +{} with HTTP {}: {}", fullPhone, ex.getRawStatusCode(), ex.getResponseBodyAsString());
            throw new RuntimeException("Unable to send OTP. MSG91 rejected the request.");
        } catch (Exception ex) {
            log.error("MSG91 OTP send failed for +{}: {}", fullPhone, ex.getMessage());
            throw new RuntimeException("Unable to send OTP. Please try again.");
        }
    }

    private boolean looksSuccessful(String responseBody) {
        String normalized = responseBody.toLowerCase(Locale.ROOT);
        return normalized.contains("success")
                || normalized.contains("sent")
                || normalized.contains("otp") && normalized.contains("mobile") && !normalized.contains("error");
    }
}

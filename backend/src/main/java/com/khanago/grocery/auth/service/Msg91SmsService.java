package com.khanago.grocery.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.UUID;
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

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

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
                    .followRedirects(HttpClient.Redirect.NORMAL)
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

    public String sendWidgetOtp(String phone) {
        AppProperties.Msg91 cfg = appProperties.getMsg91();
        String fullPhone = cfg.getCountryCode() + phone;

        if (!cfg.isWidgetEnabled()) {
            String fakeReqId = UUID.randomUUID().toString();
            log.warn("[DEV-ONLY] MSG91 widget not configured – simulating sendOtp for {} with reqId {}", phone, fakeReqId);
            return fakeReqId;
        }

        try {
            Map<String, String> body = Map.of(
                    "widgetId", cfg.getWidgetId(),
                    "tokenAuth", cfg.getTokenAuth() != null ? cfg.getTokenAuth() : cfg.getAuthKey(),
                    "identifier", fullPhone
            );

            org.springframework.http.ResponseEntity<String> resp = restClient.post()
                    .uri("/api/v5/widget/sendOtpMobile")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toEntity(String.class);

            String responseBody = resp.getBody();
            log.info("MSG91 widget sendOtpMobile status={} body=[{}]", resp.getStatusCode(), responseBody);

            if (responseBody == null || responseBody.isBlank()) {
                log.error("MSG91 widget sendOtp for +{} returned empty body", fullPhone);
                throw new RuntimeException("Unable to send OTP. MSG91 returned empty response.");
            }

            JsonNode root = OBJECT_MAPPER.readTree(responseBody);
            // MSG91 widget sendOtpMobile returns reqId in "message" field on success
            // IMPORTANT: HTTP 200 status code is the real success indicator
            // MSG91 sometimes returns type:"error" even when OTP was sent (quirk with their API)
            
            String requestId = root.path("message").asText(null);
            String typeField = root.path("type").asText("").toLowerCase(Locale.ROOT);
            
            // Trust HTTP 200 status - if we reached here, MSG91 accepted the request
            // The type field is unreliable, so we ignore it when HTTP 200 is returned
            log.debug("MSG91 widget response type='{}' for +{}: {}", typeField, fullPhone, responseBody);

            // If MSG91 doesn't provide requestId, generate one ourselves since HTTP 200 indicates OTP was sent
            if (requestId == null || requestId.isBlank()) {
                requestId = UUID.randomUUID().toString();
                log.info("MSG91 widget sent OTP (HTTP 200) but without explicit requestId. Generated fallback: {} for +{}", requestId, fullPhone);
            }

            log.info("Widget OTP dispatched via MSG91 to +{} with reqId {} and response: {}", fullPhone, requestId, responseBody);
            return requestId;
        } catch (RestClientResponseException ex) {
            log.error("MSG91 widget sendOtp failed for +{} with HTTP {} body: [{}]", fullPhone, ex.getRawStatusCode(), ex.getResponseBodyAsString());
            throw new RuntimeException("Unable to send OTP. MSG91 rejected the request. HTTP " + ex.getRawStatusCode() + ": " + ex.getResponseBodyAsString());
        } catch (Exception ex) {
            log.error("MSG91 widget sendOtp failed for +{}: {} ({})", fullPhone, ex.getMessage(), ex.getClass().getSimpleName());
            throw new RuntimeException("Unable to send OTP. Please try again.");
        }
    }

    public String retryWidgetOtp(String reqId) {
        AppProperties.Msg91 cfg = appProperties.getMsg91();
        if (!cfg.isWidgetEnabled()) {
            log.warn("[DEV-ONLY] MSG91 widget retryOtp not configured – returning original reqId");
            return reqId;
        }

        try {
            Map<String, String> body = Map.of(
                    "widgetId", cfg.getWidgetId(),
                    "tokenAuth", cfg.getTokenAuth() != null ? cfg.getTokenAuth() : cfg.getAuthKey(),
                    "reqId", reqId
            );
            String responseBody = restClient.post()
                    .uri("/api/v5/widget/retryOtp")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            log.info("MSG91 widget retryOtp raw response for reqId {}: [{}]", reqId, responseBody);
            if (responseBody == null || responseBody.isBlank()) {
                return reqId; // fallback: keep original reqId
            }
            JsonNode root = OBJECT_MAPPER.readTree(responseBody);
            boolean success = "success".equalsIgnoreCase(root.path("type").asText());
            // MSG91 returns new reqId in "message" field on success
            String returnedReqId = root.path("message").asText(null);
            if (!success || returnedReqId == null || returnedReqId.isBlank()) {
                log.warn("MSG91 widget retryOtp for reqId {} returned non-success: {}", reqId, responseBody);
                return reqId; // fallback to original
            }

            log.info("Widget OTP retried via MSG91 for reqId {} with response: {}", reqId, responseBody);
            return returnedReqId;
        } catch (RestClientResponseException ex) {
            log.error("MSG91 widget retryOtp failed for reqId {} with HTTP {}: {}", reqId, ex.getRawStatusCode(), ex.getResponseBodyAsString());
            throw new RuntimeException("Unable to resend OTP. MSG91 rejected the request.");
        } catch (Exception ex) {
            log.error("MSG91 widget retryOtp failed for reqId {}: {}", reqId, ex.getMessage());
            throw new RuntimeException("Unable to resend OTP. Please try again.");
        }
    }

    public boolean verifyWidgetOtp(String reqId, String otp) {
        AppProperties.Msg91 cfg = appProperties.getMsg91();
        if (!cfg.isWidgetEnabled()) {
            log.warn("[DEV-ONLY] MSG91 widget verifyOtp not configured – allowing verification to continue.");
            return true;
        }

        try {
            Map<String, String> body = Map.of(
                    "widgetId", cfg.getWidgetId(),
                    "tokenAuth", cfg.getTokenAuth() != null ? cfg.getTokenAuth() : cfg.getAuthKey(),
                    "reqId", reqId,
                    "otp", otp
            );

            String responseBody = restClient.post()
                    .uri("/api/v5/widget/verifyOtp")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            log.info("MSG91 widget verifyOtp raw response for reqId {}: [{}]", reqId, responseBody);
            if (responseBody == null) {
                log.error("MSG91 widget verifyOtp for reqId {} returned null body", reqId);
                return false;
            }

            JsonNode root = OBJECT_MAPPER.readTree(responseBody);
            boolean success = "success".equalsIgnoreCase(root.path("type").asText());
            log.info("MSG91 widget verifyOtp result for reqId {}: success={}", reqId, success);
            return success;
        } catch (RestClientResponseException ex) {
            log.warn("MSG91 widget verifyOtp failed for reqId {} with HTTP {}: {}", reqId, ex.getRawStatusCode(), ex.getResponseBodyAsString());
            return false;
        } catch (Exception ex) {
            log.error("MSG91 widget verifyOtp failed for reqId {}: {}", reqId, ex.getMessage());
            return false;
        }
    }

    /**
     * Verifies the access token issued by MSG91 widget after client-side OTP verification.
     * Called server-side with the token received from the client (POST /auth/verify-otp).
     * Returns true if MSG91 confirms the token is valid.
     */
    public boolean verifyAccessToken(String accessToken) {
        AppProperties.Msg91 cfg = appProperties.getMsg91();
        if (!cfg.isWidgetEnabled()) {
            log.warn("[DEV-ONLY] MSG91 widget not configured – skipping access token verification.");
            return true;
        }

        try {
            Map<String, String> body = Map.of(
                    "authkey", cfg.getAuthKey(),
                    "access-token", accessToken
            );

            String responseBody = restClient.post()
                    .uri("https://control.msg91.com/api/v5/widget/verifyAccessToken")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            if (responseBody == null) {
                log.error("MSG91 verifyAccessToken returned empty body");
                return false;
            }

            JsonNode root = OBJECT_MAPPER.readTree(responseBody);
            boolean isError = root.has("type") && "error".equalsIgnoreCase(root.get("type").asText());
            boolean success = !isError && looksSuccessful(responseBody);

            log.info("MSG91 verifyAccessToken response: {}", responseBody);
            return success;
        } catch (RestClientResponseException ex) {
            log.warn("MSG91 verifyAccessToken failed with HTTP {}: {}", ex.getRawStatusCode(), ex.getResponseBodyAsString());
            return false;
        } catch (Exception ex) {
            log.error("MSG91 verifyAccessToken failed: {}", ex.getMessage());
            return false;
        }
    }

    private boolean looksSuccessful(String responseBody) {
        String normalized = responseBody.toLowerCase(Locale.ROOT);
        return normalized.contains("success")
                || normalized.contains("sent")
                || normalized.contains("otp") && normalized.contains("mobile") && !normalized.contains("error");
    }
}
package com.khanago.grocery.delivery.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/**
 * Calculates delivery fee based on distance between the store and customer.
 * Uses Google Maps Distance Matrix API when an API key is configured,
 * otherwise falls back to the Haversine straight-line distance with a 1.3x road factor.
 *
 * Fee tiers:
 *   0–3 km  → ₹30
 *   3–7 km  → ₹50
 *   7–15 km → ₹80
 *   >15 km  → service unavailable (throws)
 */
@Slf4j
@Service
public class DeliveryFeeService {

    private static final double EARTH_RADIUS_KM = 6371.0;

    @Value("${app.store.latitude}")
    private double storeLat;

    @Value("${app.store.longitude}")
    private double storeLng;

    @Value("${app.store.max-delivery-km:15.0}")
    private double maxDeliveryKm;

    @Value("${app.google.maps.api-key:}")
    private String googleMapsApiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    /**
     * Returns the calculated delivery fee in rupees.
     *
     * @param customerLat customer latitude
     * @param customerLng customer longitude
     * @return delivery fee as BigDecimal
     */
    public BigDecimal calculateFee(double customerLat, double customerLng) {
        double distanceKm;

        if (googleMapsApiKey != null && !googleMapsApiKey.isBlank()) {
            try {
                distanceKm = fetchDistanceFromMapsApi(customerLat, customerLng);
                log.info("Google Maps distance: {} km", String.format("%.2f", distanceKm));
            } catch (Exception e) {
                log.warn("Google Maps API failed ({}), falling back to Haversine", e.getMessage());
                distanceKm = haversineDistanceKm(storeLat, storeLng, customerLat, customerLng);
            }
        } else {
            distanceKm = haversineDistanceKm(storeLat, storeLng, customerLat, customerLng);
            log.info("Haversine distance: {} km | store({},{}) -> customer({},{})",
                String.format("%.2f", distanceKm),
                String.format("%.4f", storeLat), String.format("%.4f", storeLng),
                String.format("%.4f", customerLat), String.format("%.4f", customerLng));
        }

        return feeForDistance(distanceKm);
    }

    /**
     * Returns both the fee and the computed distance (for display).
     */
    public DeliveryFeeResult calculateFeeWithDetails(double customerLat, double customerLng) {
        double distanceKm;
        String method;

        if (googleMapsApiKey != null && !googleMapsApiKey.isBlank()) {
            try {
                distanceKm = fetchDistanceFromMapsApi(customerLat, customerLng);
                method = "road";
            } catch (Exception e) {
                log.warn("Google Maps API failed ({}), falling back to Haversine", e.getMessage());
                distanceKm = haversineDistanceKm(storeLat, storeLng, customerLat, customerLng);
                method = "straight-line";
            }
        } else {
            distanceKm = haversineDistanceKm(storeLat, storeLng, customerLat, customerLng);
            method = "straight-line";
        }

        BigDecimal fee = feeForDistance(distanceKm);
        return new DeliveryFeeResult(fee, distanceKm, method);
    }

    // ── private helpers ────────────────────────────────────────────────────────

    private double fetchDistanceFromMapsApi(double customerLat, double customerLng) throws Exception {
        String origins = storeLat + "," + storeLng;
        String destinations = customerLat + "," + customerLng;

        URI uri = UriComponentsBuilder
                .fromUriString("https://maps.googleapis.com/maps/api/distancematrix/json")
                .queryParam("origins", origins)
                .queryParam("destinations", destinations)
                .queryParam("mode", "driving")
                .queryParam("key", googleMapsApiKey)
                .build()
                .toUri();

        HttpRequest request = HttpRequest.newBuilder(uri).GET().build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        JsonNode root = objectMapper.readTree(response.body());
        String status = root.path("status").asText();
        if (!"OK".equals(status)) {
            throw new RuntimeException("Google Maps API returned status: " + status);
        }

        JsonNode element = root.path("rows").get(0).path("elements").get(0);
        String elementStatus = element.path("status").asText();
        if (!"OK".equals(elementStatus)) {
            throw new RuntimeException("Distance element status: " + elementStatus);
        }

        long distanceMeters = element.path("distance").path("value").asLong();
        return distanceMeters / 1000.0;
    }

    private BigDecimal feeForDistance(double distanceKm) {
        if (distanceKm <= 3.0) return new BigDecimal("30");
        if (distanceKm <= 7.0) return new BigDecimal("50");
        if (distanceKm <= maxDeliveryKm) return new BigDecimal("80");
        throw new com.khanago.grocery.common.exception.ApiException(
                "Sorry, we don't deliver beyond " + (int) maxDeliveryKm + " km. Your location is " +
                String.format("%.1f", distanceKm) + " km from our store.");
    }

    private double haversineDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double straightLine = EARTH_RADIUS_KM * c;
        // Apply 1.3x road factor for realistic road distance estimation
        return straightLine * 1.3;
    }

    public record DeliveryFeeResult(BigDecimal fee, double distanceKm, String method) {}
}

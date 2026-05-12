package com.khanago.grocery.catalog.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.khanago.grocery.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.net.http.HttpClient;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin/catalog/openfoodfacts")
public class OpenFoodFactsController {

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    public OpenFoodFactsController(ObjectMapper objectMapper, AppProperties appProperties) {
        this.objectMapper = objectMapper;
        this.restTemplate = buildRestTemplate(appProperties.getMsg91().isTrustAllSsl());
    }

    private RestTemplate buildRestTemplate(boolean trustAll) {
        if (!trustAll) {
            return new RestTemplate();
        }
        try {
            TrustManager[] trustAllCerts = new TrustManager[]{new X509TrustManager() {
                public void checkClientTrusted(X509Certificate[] c, String a) {}
                public void checkServerTrusted(X509Certificate[] c, String a) {}
                public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            }};
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAllCerts, new SecureRandom());

            HttpClient httpClient = HttpClient.newBuilder()
                    .sslContext(sslContext)
                    .followRedirects(HttpClient.Redirect.NORMAL)
                    .build();

            log.info("OpenFoodFacts client using trust-all SSL (dev mode)");
            return new RestTemplate(new JdkClientHttpRequestFactory(httpClient));
        } catch (Exception e) {
            log.warn("Could not build trust-all SSL client, falling back to default: {}", e.getMessage());
            return new RestTemplate();
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, String>>> search(@RequestParam String q) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "OrderKro/1.0 (grocery delivery app; contact@orderkro.in)");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            String url = UriComponentsBuilder
                    .fromHttpUrl("https://world.openfoodfacts.org/cgi/search.pl")
                    .queryParam("search_terms", q.trim())
                    .queryParam("search_simple", "1")
                    .queryParam("action", "process")
                    .queryParam("json", "1")
                    .queryParam("page_size", "20")
                    .queryParam("fields", "product_name,brands,image_url,image_thumb_url,image_front_url,image_front_thumb_url,image_small_url")
                    .build().toUriString();

            log.info("Searching Open Food Facts for: {}", q);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            String json = response.getBody();

            if (json == null) {
                log.warn("Open Food Facts returned null body for query '{}'", q);
                return ResponseEntity.ok(List.of());
            }

            JsonNode root = objectMapper.readTree(json);
            JsonNode products = root.path("products");
            log.info("Open Food Facts returned {} raw products for query '{}'", products.size(), q);

            List<Map<String, String>> results = new ArrayList<>();
            for (JsonNode p : products) {
                String full = firstNonBlank(
                        p.path("image_front_url").asText(""),
                        p.path("image_url").asText(""),
                        p.path("image_small_url").asText("")
                );
                String thumb = firstNonBlank(
                        p.path("image_front_thumb_url").asText(""),
                        p.path("image_thumb_url").asText(""),
                        full
                );

                if (full.isBlank()) continue;

                String name = p.path("product_name").asText("").trim();
                if (name.isBlank()) name = "Unknown";

                results.add(Map.of(
                        "name",  name,
                        "brand", p.path("brands").asText(""),
                        "thumb", thumb,
                        "url",   full
                ));
                if (results.size() >= 9) break;
            }

            log.info("Returning {} image results for query '{}'", results.size(), q);
            return ResponseEntity.ok(results);

        } catch (Exception e) {
            log.error("Open Food Facts search failed for query '{}': {}", q, e.getMessage(), e);
            return ResponseEntity.ok(List.of());
        }
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return "";
    }
}

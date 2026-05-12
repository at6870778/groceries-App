package com.khanago.grocery.catalog.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.khanago.grocery.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.io.IOException;
import java.net.http.HttpClient;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.Map;

@Slf4j
@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;
    private final boolean enabled;
    private final RestTemplate httpClient;

    public CloudinaryService(AppProperties props) {
        AppProperties.Cloudinary cfg = props.getCloudinary();
        this.enabled = cfg.isConfigured();
        if (this.enabled) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cfg.getCloudName(),
                    "api_key",    cfg.getApiKey(),
                    "api_secret", cfg.getApiSecret(),
                    "secure",     true
            ));
            log.info("Cloudinary configured for cloud: {}", cfg.getCloudName());
        } else {
            this.cloudinary = null;
            log.warn("Cloudinary not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
        }
        this.httpClient = buildTrustAllRestTemplate();
    }

    private RestTemplate buildTrustAllRestTemplate() {
        try {
            TrustManager[] trustAll = new TrustManager[]{new X509TrustManager() {
                public void checkClientTrusted(X509Certificate[] c, String a) {}
                public void checkServerTrusted(X509Certificate[] c, String a) {}
                public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            }};
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAll, new SecureRandom());
            HttpClient client = HttpClient.newBuilder()
                    .sslContext(sslContext)
                    .followRedirects(HttpClient.Redirect.NORMAL)
                    .build();
            return new RestTemplate(new JdkClientHttpRequestFactory(client));
        } catch (Exception e) {
            log.warn("Could not build trust-all SSL client for image download: {}", e.getMessage());
            return new RestTemplate();
        }
    }

    /**
     * Downloads the image from the given URL in our backend, then uploads the
     * raw bytes to Cloudinary. This avoids Cloudinary trying to pull from
     * openfoodfacts.org directly (which times out).
     */
    public String uploadProductImageFromUrl(String imageUrl) throws IOException {
        if (!enabled) {
            throw new IllegalStateException(
                "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
        }
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new IllegalArgumentException("No image URL provided");
        }

        // Download image bytes in our backend first so Cloudinary doesn't need
        // to reach openfoodfacts.org (which times out from Cloudinary's servers).
        log.info("Downloading image from URL: {}", imageUrl);
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "OrderKro/1.0 (grocery delivery app; contact@orderkro.in)");
        byte[] imageBytes;
        try {
            imageBytes = httpClient.exchange(
                    imageUrl, HttpMethod.GET, new HttpEntity<>(headers), byte[].class
            ).getBody();
        } catch (Exception e) {
            throw new IOException("Failed to download image from URL: " + e.getMessage(), e);
        }
        if (imageBytes == null || imageBytes.length == 0) {
            throw new IOException("Downloaded image is empty");
        }
        log.info("Downloaded {} bytes, uploading to Cloudinary", imageBytes.length);

        @SuppressWarnings("unchecked")
        Map<String, Object> uploadResult = cloudinary.uploader().upload(
                imageBytes,
                ObjectUtils.asMap(
                        "folder",        "orderkro/products",
                        "resource_type", "image",
                        "overwrite",     false
                )
        );
        return (String) uploadResult.get("secure_url");
    }

    /**
     * Uploads a multipart image file to Cloudinary under the orderkro/products folder.
     * @return the https secure_url of the uploaded image
     * @throws IllegalStateException if Cloudinary credentials are not configured
     * @throws IOException if the upload fails
     */
    @SuppressWarnings("unchecked")
    public String uploadProductImage(MultipartFile file) throws IOException {
        if (!enabled) {
            throw new IllegalStateException(
                "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
        }
        validateImageFile(file);

        Map<String, Object> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder",        "orderkro/products",
                        "resource_type", "image",
                        "overwrite",     false
                )
        );
        return (String) uploadResult.get("secure_url");
    }

    public boolean isEnabled() {
        return enabled;
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file provided");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }
        long maxBytes = 5L * 1024 * 1024; // 5 MB
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException("Image file must be under 5 MB");
        }
    }
}

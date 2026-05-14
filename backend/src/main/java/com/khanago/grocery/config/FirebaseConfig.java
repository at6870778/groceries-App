package com.khanago.grocery.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class FirebaseConfig {

    private final AppProperties appProperties;

    @Value("${FIREBASE_SERVICE_ACCOUNT_JSON:}")
    private String serviceAccountBase64;

    @PostConstruct
    public void initialize() {
        if (!FirebaseApp.getApps().isEmpty()) return;

        try {
            InputStream is = resolveCredentialsStream();
            if (is == null) {
                log.warn("Firebase credentials not configured — FCM push notifications disabled.");
                return;
            }
            try (is) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(is))
                        .build();
                FirebaseApp.initializeApp(options);
                log.info("Firebase initialized successfully.");
            }
        } catch (IOException e) {
            log.error("Failed to initialize Firebase: {}", e.getMessage());
        }
    }

    private InputStream resolveCredentialsStream() throws IOException {
        // Priority 1: base64 env var (preferred for production / Docker)
        if (serviceAccountBase64 != null && !serviceAccountBase64.isBlank()) {
            byte[] decoded = Base64.getDecoder().decode(serviceAccountBase64.trim());
            return new ByteArrayInputStream(decoded);
        }
        // Priority 2: file path from app properties
        AppProperties.Firebase firebaseProp = appProperties.getFirebase();
        if (!firebaseProp.isConfigured()) return null;
        String path = firebaseProp.getServiceAccountPath();
        Resource resource = path.startsWith("classpath:")
                ? new ClassPathResource(path.substring("classpath:".length()))
                : new FileSystemResource(path);
        return resource.exists() ? resource.getInputStream() : null;
    }
}

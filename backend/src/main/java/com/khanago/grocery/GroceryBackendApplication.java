package com.khanago.grocery;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class GroceryBackendApplication {

    public static void main(String[] args) {
        loadLocalDotEnv();
        SpringApplication.run(GroceryBackendApplication.class, args);
    }

    /**
     * Loads ../.env when running locally from the backend module so Maven runs
     * can pick up MSG91 and other secrets without manual export.
     */
    private static void loadLocalDotEnv() {
        Path dotEnvPath = Path.of("..", ".env").normalize();
        if (!Files.exists(dotEnvPath)) {
            return;
        }

        try {
            List<String> lines = Files.readAllLines(dotEnvPath);
            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }

                String[] parts = trimmed.split("=", 2);
                if (parts.length != 2) {
                    continue;
                }

                String key = parts[0].trim();
                String value = parts[1].trim();
                if (!key.isEmpty() && System.getProperty(key) == null && System.getenv(key) == null) {
                    System.setProperty(key, value);
                }
            }
        } catch (IOException ignored) {
            // Local dev convenience only; if loading fails, Spring will fall back to normal env resolution.
        }
    }
}

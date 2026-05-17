package com.khanago.grocery.notification;

import com.khanago.grocery.common.enums.RoleName;
import com.khanago.grocery.common.service.FcmService;
import com.khanago.grocery.user.User;
import com.khanago.grocery.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin API: send targeted or broadcast push notifications to customers.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

    private final UserRepository userRepository;
    private final FcmService fcmService;
    private final UserNotificationService userNotificationService;

    /**
     * Send to a specific user by their ID or phone number.
     * Body: { "userId": 42, "phone": "9876543210", "title": "...", "body": "..." }
     * Either userId or phone must be provided.
     */
    @PostMapping("/send-to-user")
    public ResponseEntity<Map<String, Object>> sendToUser(@RequestBody Map<String, Object> body) {
        String title = (String) body.getOrDefault("title", "");
        String message = (String) body.getOrDefault("body", "");
        if (title.isBlank() || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "title and body are required"));
        }

        User user = null;
        if (body.get("userId") != null) {
            Long uid = Long.valueOf(body.get("userId").toString());
            user = userRepository.findById(uid).orElse(null);
        } else if (body.get("phone") != null) {
            user = userRepository.findByPhone(body.get("phone").toString()).orElse(null);
        }

        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }

        boolean pushed = false;
        if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
            fcmService.sendToToken(user.getFcmToken(), title, message, "OPEN_HOME");
            pushed = true;
        }
        userNotificationService.save(user, title, message, "ADMIN");

        return ResponseEntity.ok(Map.of(
                "status", "sent",
                "userId", user.getId(),
                "name", user.getFullName() != null ? user.getFullName() : user.getPhone(),
                "pushed", pushed
        ));
    }

    /**
     * Send to ALL customers.
     * Body: { "title": "...", "body": "..." }
     */
    @PostMapping("/send-to-all")
    public ResponseEntity<Map<String, Object>> sendToAll(@RequestBody Map<String, Object> body) {
        String title = (String) body.getOrDefault("title", "");
        String message = (String) body.getOrDefault("body", "");
        if (title.isBlank() || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "title and body are required"));
        }

        List<User> customers = userRepository.findByRoles_Name(RoleName.CUSTOMER);
        int pushed = 0;
        for (User customer : customers) {
            if (customer.getFcmToken() != null && !customer.getFcmToken().isBlank()) {
                fcmService.sendToToken(customer.getFcmToken(), title, message, "OPEN_HOME");
                pushed++;
            }
            userNotificationService.save(customer, title, message, "ADMIN");
        }

        return ResponseEntity.ok(Map.of(
                "status", "sent",
                "totalUsers", customers.size(),
                "pushed", pushed
        ));
    }

    /**
     * List all customers (id, name, phone) so admin can pick who to notify.
     */
    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> listCustomers() {
        List<User> customers = userRepository.findByRoles_Name(RoleName.CUSTOMER);
        List<Map<String, Object>> result = customers.stream().map(u -> Map.<String, Object>of(
                "id", u.getId(),
                "name", u.getFullName() != null ? u.getFullName() : "",
                "phone", u.getPhone() != null ? u.getPhone() : ""
        )).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * Search customers by name or phone number.
     * Query params: ?q=searchTerm
     */
    @GetMapping("/users/search")
    public ResponseEntity<List<Map<String, Object>>> searchCustomers(@RequestParam(name = "q") String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(List.of());
        }

        List<User> customers = userRepository.searchCustomers(RoleName.CUSTOMER, searchTerm.trim());
        List<Map<String, Object>> result = customers.stream()
                .limit(20) // Limit to 20 results
                .map(u -> Map.<String, Object>of(
                        "id", u.getId(),
                        "name", u.getFullName() != null ? u.getFullName() : "",
                        "phone", u.getPhone() != null ? u.getPhone() : ""
                )).toList();
        return ResponseEntity.ok(result);
    }
}

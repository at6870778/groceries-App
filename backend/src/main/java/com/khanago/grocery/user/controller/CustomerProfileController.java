package com.khanago.grocery.user.controller;

import com.khanago.grocery.user.dto.AddressDto;
import com.khanago.grocery.user.dto.AddressUpsertDto;
import com.khanago.grocery.user.dto.ProfileDto;
import com.khanago.grocery.user.dto.UpdateProfileDto;
import com.khanago.grocery.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import java.util.List;

@RestController
@RequestMapping("/api/customer/profile")
@RequiredArgsConstructor
public class CustomerProfileController {

    private final UserService userService;

    @GetMapping
    public ProfileDto profile() {
        return userService.getProfile();
    }

    @PutMapping
    public ProfileDto updateProfile(@Valid @RequestBody UpdateProfileDto request) {
        return userService.updateProfile(request);
    }

    @GetMapping("/addresses")
    public List<AddressDto> addresses() {
        return userService.listAddresses();
    }

    @PostMapping("/addresses")
    public AddressDto addAddress(@Valid @RequestBody AddressUpsertDto request) {
        return userService.addAddress(request);
    }

    @PutMapping("/addresses/{id}")
    public AddressDto updateAddress(@PathVariable Long id, @Valid @RequestBody AddressUpsertDto request) {
        return userService.updateAddress(id, request);
    }

    @DeleteMapping("/addresses/{id}")
    public void deleteAddress(@PathVariable Long id) {
        userService.deleteAddress(id);
    }

    /** Called by the Ionic app after getting the FCM device token. */
    @PostMapping("/fcm-token")
    public ResponseEntity<Void> registerFcmToken(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        userService.registerFcmToken(token);
        return ResponseEntity.ok().build();
    }
}

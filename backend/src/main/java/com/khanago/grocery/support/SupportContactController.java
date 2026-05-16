package com.khanago.grocery.support;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class SupportContactController {

    private final SupportContactConfigRepository repository;

    @GetMapping("/api/public/support-contact")
    public SupportContactConfig getSupportContact() {
        return repository.findById(1L).orElseGet(SupportContactConfig::new);
    }

    @GetMapping("/api/admin/support-contact")
    public SupportContactConfig getSupportContactForAdmin() {
        return repository.findById(1L).orElseGet(SupportContactConfig::new);
    }

    @PutMapping("/api/admin/support-contact")
    public SupportContactConfig updateSupportContact(@RequestBody Map<String, Object> body) {
        SupportContactConfig config = repository.findById(1L).orElseGet(SupportContactConfig::new);
        config.setId(1L);

        if (body.containsKey("phoneNumber")) {
            config.setPhoneNumber(cleanValue((String) body.get("phoneNumber")));
        }
        if (body.containsKey("supportEmail")) {
            config.setSupportEmail(cleanValue((String) body.get("supportEmail")));
        }
        if (body.containsKey("privacyEmail")) {
            config.setPrivacyEmail(cleanValue((String) body.get("privacyEmail")));
        }
        if (body.containsKey("addressLine")) {
            config.setAddressLine(cleanValue((String) body.get("addressLine")));
        }

        return repository.save(config);
    }

    private String cleanValue(String value) {
        return value == null ? null : value.trim();
    }
}
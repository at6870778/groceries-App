package com.khanago.grocery.support;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "support_contact_config")
public class SupportContactConfig {

    @Id
    private Long id = 1L;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber = "+919876543210";

    @Column(name = "support_email", length = 120)
    private String supportEmail = "support@orderkro.in";

    @Column(name = "privacy_email", length = 120)
    private String privacyEmail = "privacy@orderkro.in";

    @Column(name = "address_line", length = 255)
    private String addressLine = "Hata Kushinagar, Uttar Pradesh";

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    @PrePersist
    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
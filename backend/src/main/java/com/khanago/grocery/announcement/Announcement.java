package com.khanago.grocery.announcement;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "announcement")
public class Announcement {

    @Id
    private Long id = 1L;

    @Column(columnDefinition = "TEXT")
    private String message = "";

    @Column(nullable = false)
    private boolean active = false;

    @Column(name = "bg_color", length = 20)
    private String bgColor = "#667eea";

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    @PrePersist
    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}

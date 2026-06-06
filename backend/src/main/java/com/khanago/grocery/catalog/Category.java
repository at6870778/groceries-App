package com.khanago.grocery.catalog;

import com.khanago.grocery.common.entity.BaseAuditEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "categories")
public class Category extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 140)
    private String slug;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(length = 10)
    private String emoji;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}

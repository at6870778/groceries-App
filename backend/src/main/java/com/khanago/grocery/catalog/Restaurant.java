package com.khanago.grocery.catalog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "restaurants")
public class Restaurant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "cuisine_type", length = 100)
    private String cuisineType;

    @Column(length = 500)
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(precision = 2, scale = 1)
    private BigDecimal rating;

    @Column(name = "delivery_time_min")
    private Integer deliveryTimeMin;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column
    private Double latitude;

    @Column
    private Double longitude;
}

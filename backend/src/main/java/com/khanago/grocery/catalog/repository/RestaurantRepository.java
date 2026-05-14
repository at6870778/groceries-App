package com.khanago.grocery.catalog.repository;

import com.khanago.grocery.catalog.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {
    List<Restaurant> findByActiveTrue();

    /**
     * Haversine formula — returns restaurants within radiusKm of (lat, lng),
     * ordered nearest-first. Works on H2 and standard SQL databases.
     */
    @Query(value = """
        SELECT r.* FROM restaurants r
        WHERE r.is_active = TRUE
          AND r.latitude IS NOT NULL
          AND r.longitude IS NOT NULL
          AND (6371 * ACOS(
                GREATEST(-1.0, LEAST(1.0,
                  COS(RADIANS(:lat)) * COS(RADIANS(r.latitude))
                  * COS(RADIANS(r.longitude) - RADIANS(:lng))
                  + SIN(RADIANS(:lat)) * SIN(RADIANS(r.latitude))
                ))
              ) <= :radiusKm)
        ORDER BY (6371 * ACOS(
                GREATEST(-1.0, LEAST(1.0,
                  COS(RADIANS(:lat)) * COS(RADIANS(r.latitude))
                  * COS(RADIANS(r.longitude) - RADIANS(:lng))
                  + SIN(RADIANS(:lat)) * SIN(RADIANS(r.latitude))
                ))
              )) ASC
        """, nativeQuery = true)
    List<Restaurant> findNearby(@Param("lat") double lat,
                                @Param("lng") double lng,
                                @Param("radiusKm") double radiusKm);
}

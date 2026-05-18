package com.khanago.grocery.catalog.repository;

import com.khanago.grocery.catalog.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    @EntityGraph(attributePaths = {"category"})
    Page<Product> findByActiveTrue(Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Product> findByActiveTrueAndRestaurantIdIsNull(Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Product> findByCategoryIdAndActiveTrue(Long categoryId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Product> findByRestaurantIdAndActiveTrue(Long restaurantId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Product> findByNameContainingIgnoreCaseAndActiveTrue(String query, Pageable pageable);

    // Admin endpoints - show all products regardless of active status
    @EntityGraph(attributePaths = {"category"})
    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Product> findByNameContainingIgnoreCase(String query, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    @Override
    Page<Product> findAll(Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"category"})
    Optional<Product> findById(Long id);

    long countByActiveTrue();
}

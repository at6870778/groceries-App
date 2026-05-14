package com.khanago.grocery.catalog.controller;

import com.khanago.grocery.catalog.dto.CategoryDto;
import com.khanago.grocery.catalog.dto.ProductDto;
import com.khanago.grocery.catalog.dto.RestaurantDto;
import com.khanago.grocery.catalog.service.CatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/catalog")
@RequiredArgsConstructor
public class CatalogController {

    private final CatalogService catalogService;

    @GetMapping("/categories")
    public List<CategoryDto> categories() {
        return catalogService.getActiveCategories();
    }

    @GetMapping("/restaurants")
    public List<RestaurantDto> restaurants(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(defaultValue = "5.0") double radiusKm) {
        return catalogService.getNearbyRestaurants(lat, lng, radiusKm);
    }

    @GetMapping("/products")
    public Page<ProductDto> products(@RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "20") int size,
                                     @RequestParam(required = false) Long categoryId,
                                     @RequestParam(required = false) Long restaurantId,
                                     @RequestParam(required = false) String query) {
        return catalogService.listProducts(page, size, categoryId, restaurantId, query);
    }

    @GetMapping("/products/{id}")
    public ProductDto product(@PathVariable Long id) {
        return catalogService.getProduct(id);
    }
}

package com.khanago.grocery.catalog.service;

import com.khanago.grocery.catalog.Category;
import com.khanago.grocery.catalog.Product;
import com.khanago.grocery.catalog.Restaurant;
import com.khanago.grocery.catalog.dto.*;
import com.khanago.grocery.catalog.repository.CategoryRepository;
import com.khanago.grocery.catalog.repository.ProductRepository;
import com.khanago.grocery.catalog.repository.RestaurantRepository;
import com.khanago.grocery.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final RestaurantRepository restaurantRepository;

    public List<CategoryDto> getActiveCategories() {
        return categoryRepository.findByActiveTrue().stream().map(this::toCategoryDto).toList();
    }

    public List<CategoryDto> getAllCategories() {
        return categoryRepository.findAll().stream().map(this::toCategoryDto).toList();
    }

    public Page<ProductDto> listProducts(int page, int size, Long categoryId, Long restaurantId, String query) {
        PageRequest pageable = PageRequest.of(page, size);
        if (query != null && !query.isBlank()) {
            return productRepository.findByNameContainingIgnoreCaseAndActiveTrue(query, pageable).map(this::toProductDto);
        }
        if (restaurantId != null) {
            return productRepository.findByRestaurantIdAndActiveTrue(restaurantId, pageable).map(this::toProductDto);
        }
        if (categoryId != null) {
            return productRepository.findByCategoryIdAndActiveTrue(categoryId, pageable).map(this::toProductDto);
        }
        return productRepository.findByActiveTrueAndRestaurantIdIsNull(pageable).map(this::toProductDto);
    }

    // Admin product listing - shows all products (active + inactive)
    @Transactional(readOnly = true)
    public Page<ProductDto> listAdminProducts(int page, int size, Long categoryId, String query) {
        PageRequest pageable = PageRequest.of(page, size);
        if (query != null && !query.isBlank()) {
            return productRepository.findByNameContainingIgnoreCase(query, pageable).map(this::toProductDto);
        }
        if (categoryId != null) {
            return productRepository.findByCategoryId(categoryId, pageable).map(this::toProductDto);
        }
        return productRepository.findAll(pageable).map(this::toProductDto);
    }

    public List<RestaurantDto> getNearbyRestaurants(Double lat, Double lng, double radiusKm) {
        List<Restaurant> list = (lat != null && lng != null)
                ? restaurantRepository.findNearby(lat, lng, radiusKm)
                : restaurantRepository.findByActiveTrue();
        return list.stream()
                .map(r -> toRestaurantDto(r, lat, lng))
                .toList();
    }

    public ProductDto getProduct(Long id) {
        return toProductDto(productRepository.findById(id).orElseThrow(() -> new ApiException("Product not found")));
    }

    public CategoryDto createCategory(CategoryUpsertDto request) {
        Category category = new Category();
        category.setName(request.name());
        category.setSlug(request.slug());
        category.setImageUrl(request.imageUrl());
        category.setActive(request.active());
        return toCategoryDto(categoryRepository.save(category));
    }

    public CategoryDto updateCategory(Long id, CategoryUpsertDto request) {
        Category category = categoryRepository.findById(id).orElseThrow(() -> new ApiException("Category not found"));
        category.setName(request.name());
        category.setSlug(request.slug());
        category.setImageUrl(request.imageUrl());
        category.setActive(request.active());
        return toCategoryDto(categoryRepository.save(category));
    }

    public ProductDto createProduct(ProductUpsertDto request) {
        Product product = new Product();
        mapProduct(product, request);
        Product saved = productRepository.save(product);
        return getProduct(saved.getId());
    }

    public ProductDto updateProduct(Long id, ProductUpsertDto request) {
        Product product = productRepository.findById(id).orElseThrow(() -> new ApiException("Product not found"));
        mapProduct(product, request);
        Product saved = productRepository.save(product);
        return getProduct(saved.getId());
    }

    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }

    public void deleteCategory(Long id) {
        categoryRepository.deleteById(id);
    }

    private void mapProduct(Product product, ProductUpsertDto request) {
        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ApiException("Category not found"));

        product.setCategory(category);
        product.setName(request.name());
        product.setSku(request.sku());
        product.setDescription(request.description());
        product.setUnit(request.unit());
        product.setMrp(request.mrp());
        product.setSellingPrice(request.sellingPrice());
        product.setStockQty(request.stockQty());
        product.setImageUrl(request.imageUrl());
        product.setActive(request.active());
    }

    private CategoryDto toCategoryDto(Category category) {
        return new CategoryDto(category.getId(), category.getName(), category.getSlug(), category.getImageUrl(), category.isActive());
    }

    private RestaurantDto toRestaurantDto(Restaurant r, Double userLat, Double userLng) {
        Double distKm = null;
        if (userLat != null && userLng != null && r.getLatitude() != null && r.getLongitude() != null) {
            distKm = haversineKm(userLat, userLng, r.getLatitude(), r.getLongitude());
            distKm = Math.round(distKm * 10.0) / 10.0;
        }
        return new RestaurantDto(r.getId(), r.getName(), r.getCuisineType(), r.getAddress(),
                r.getPhone(), r.getImageUrl(), r.getRating(), r.getDeliveryTimeMin(), r.isActive(),
                r.getLatitude(), r.getLongitude(), distKm);
    }

    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private ProductDto toProductDto(Product product) {
        return new ProductDto(
                product.getId(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.getRestaurantId(),
                product.getName(),
                product.getSku(),
                product.getDescription(),
                product.getUnit(),
                product.getMrp(),
                product.getSellingPrice(),
                product.getStockQty(),
                product.getImageUrl(),
                product.isActive()
        );
    }
}

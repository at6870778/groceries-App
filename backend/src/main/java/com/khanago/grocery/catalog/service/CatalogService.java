package com.khanago.grocery.catalog.service;

import com.khanago.grocery.catalog.Category;
import com.khanago.grocery.catalog.Product;
import com.khanago.grocery.catalog.dto.*;
import com.khanago.grocery.catalog.repository.CategoryRepository;
import com.khanago.grocery.catalog.repository.ProductRepository;
import com.khanago.grocery.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public List<CategoryDto> getActiveCategories() {
        return categoryRepository.findByActiveTrue().stream().map(this::toCategoryDto).toList();
    }

    public List<CategoryDto> getAllCategories() {
        return categoryRepository.findAll().stream().map(this::toCategoryDto).toList();
    }

    public Page<ProductDto> listProducts(int page, int size, Long categoryId, String query) {
        PageRequest pageable = PageRequest.of(page, size);
        if (query != null && !query.isBlank()) {
            return productRepository.findByNameContainingIgnoreCaseAndActiveTrue(query, pageable).map(this::toProductDto);
        }
        if (categoryId != null) {
            return productRepository.findByCategoryIdAndActiveTrue(categoryId, pageable).map(this::toProductDto);
        }
        return productRepository.findByActiveTrue(pageable).map(this::toProductDto);
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

    private ProductDto toProductDto(Product product) {
        return new ProductDto(
                product.getId(),
                product.getCategory().getId(),
                product.getCategory().getName(),
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

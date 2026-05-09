package com.khanago.grocery.catalog.controller;

import com.khanago.grocery.catalog.dto.*;
import com.khanago.grocery.catalog.service.CatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/catalog")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final CatalogService catalogService;

    @GetMapping("/categories")
    public List<CategoryDto> listCategories() {
        return catalogService.getAllCategories();
    }

    @PostMapping("/categories")
    public CategoryDto createCategory(@Valid @RequestBody CategoryUpsertDto request) {
        return catalogService.createCategory(request);
    }

    @PutMapping("/categories/{id}")
    public CategoryDto updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryUpsertDto request) {
        return catalogService.updateCategory(id, request);
    }

    @DeleteMapping("/categories/{id}")
    public void deleteCategory(@PathVariable Long id) {
        catalogService.deleteCategory(id);
    }

    @PostMapping("/products")
    public ProductDto createProduct(@Valid @RequestBody ProductUpsertDto request) {
        return catalogService.createProduct(request);
    }

    @PutMapping("/products/{id}")
    public ProductDto updateProduct(@PathVariable Long id, @Valid @RequestBody ProductUpsertDto request) {
        return catalogService.updateProduct(id, request);
    }

    @DeleteMapping("/products/{id}")
    public void deleteProduct(@PathVariable Long id) {
        catalogService.deleteProduct(id);
    }
}

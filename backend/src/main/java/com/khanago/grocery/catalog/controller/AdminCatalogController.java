package com.khanago.grocery.catalog.controller;

import com.khanago.grocery.catalog.dto.*;
import com.khanago.grocery.catalog.service.CatalogService;
import com.khanago.grocery.catalog.service.CloudinaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/catalog")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final CatalogService catalogService;
    private final CloudinaryService cloudinaryService;

    @GetMapping("/products")
    public org.springframework.data.domain.Page<ProductDto> listProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String query) {
        return catalogService.listAdminProducts(page, size, categoryId, query);
    }

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

    @PostMapping("/upload-image")
    public Map<String, String> uploadImage(@RequestParam("file") MultipartFile file) {
        if (!cloudinaryService.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Image upload is not configured. Set Cloudinary credentials.");
        }
        try {
            String url = cloudinaryService.uploadProductImage(file);
            return Map.of("url", url);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Upload failed: " + e.getMessage());
        }
    }

    @PostMapping("/upload-from-url")
    public Map<String, String> uploadFromUrl(@RequestBody Map<String, String> body) {
        if (!cloudinaryService.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Image upload is not configured. Set Cloudinary credentials.");
        }
        String imageUrl = body.get("url");
        try {
            String cloudUrl = cloudinaryService.uploadProductImageFromUrl(imageUrl);
            return Map.of("url", cloudUrl);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Upload failed: " + e.getMessage());
        }
    }
}

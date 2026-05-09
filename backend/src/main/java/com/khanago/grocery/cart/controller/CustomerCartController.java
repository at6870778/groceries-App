package com.khanago.grocery.cart.controller;

import com.khanago.grocery.cart.dto.CartDto;
import com.khanago.grocery.cart.dto.CartItemRequestDto;
import com.khanago.grocery.cart.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customer/cart")
@RequiredArgsConstructor
public class CustomerCartController {

    private final CartService cartService;

    @GetMapping
    public CartDto cart() {
        return cartService.getMyCart();
    }

    @PostMapping("/items")
    public CartDto addOrUpdateItem(@Valid @RequestBody CartItemRequestDto request) {
        return cartService.upsertItem(request);
    }

    @DeleteMapping("/items/{productId}")
    public CartDto removeItem(@PathVariable Long productId) {
        return cartService.removeItem(productId);
    }
}

package com.khanago.grocery.cart.service;

import com.khanago.grocery.cart.Cart;
import com.khanago.grocery.cart.CartItem;
import com.khanago.grocery.cart.dto.CartDto;
import com.khanago.grocery.cart.dto.CartItemDto;
import com.khanago.grocery.cart.dto.CartItemRequestDto;
import com.khanago.grocery.cart.repository.CartItemRepository;
import com.khanago.grocery.cart.repository.CartRepository;
import com.khanago.grocery.catalog.Product;
import com.khanago.grocery.catalog.repository.ProductRepository;
import com.khanago.grocery.common.exception.ApiException;
import com.khanago.grocery.security.SecurityUtils;
import com.khanago.grocery.user.User;
import com.khanago.grocery.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public CartDto getMyCart() {
        Cart cart = getOrCreateCart(SecurityUtils.getCurrentUserId());
        return toCartDto(cart);
    }

    public CartDto upsertItem(CartItemRequestDto request) {
        Cart cart = getOrCreateCart(SecurityUtils.getCurrentUserId());
        Product product = productRepository.findById(request.productId()).orElseThrow(() -> new ApiException("Product not found"));

        CartItem item = cartItemRepository.findByCartIdAndProductId(cart.getId(), request.productId()).orElseGet(() -> {
            CartItem newItem = new CartItem();
            newItem.setCart(cart);
            newItem.setProduct(product);
            return newItem;
        });

        item.setQuantity(request.quantity());
        item.setUnitPrice(product.getSellingPrice());
        cartItemRepository.save(item);
        return toCartDto(cart);
    }

    public CartDto removeItem(Long productId) {
        Cart cart = getOrCreateCart(SecurityUtils.getCurrentUserId());
        CartItem item = cartItemRepository.findByCartIdAndProductId(cart.getId(), productId)
                .orElseThrow(() -> new ApiException("Cart item not found"));
        cartItemRepository.delete(item);
        return toCartDto(cart);
    }

    @Transactional
    public void clearCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        cartItemRepository.deleteByCartId(cart.getId());
    }

    public List<CartItem> getCartItems(Long userId) {
        Cart cart = getOrCreateCart(userId);
        return cartItemRepository.findByCartId(cart.getId());
    }

    private Cart getOrCreateCart(Long userId) {
        return cartRepository.findByUserId(userId).orElseGet(() -> {
            User user = userRepository.findById(userId).orElseThrow(() -> new ApiException("User not found"));
            Cart cart = new Cart();
            cart.setUser(user);
            return cartRepository.save(cart);
        });
    }

    private CartDto toCartDto(Cart cart) {
        List<CartItemDto> items = cartItemRepository.findByCartId(cart.getId()).stream()
                .map(i -> new CartItemDto(
                        i.getId(),
                        i.getProduct().getId(),
                        i.getProduct().getName(),
                        i.getProduct().getUnit(),
                        i.getQuantity(),
                        i.getUnitPrice(),
                        i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity()))
                ))
                .toList();

        BigDecimal subtotal = items.stream().map(CartItemDto::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CartDto(cart.getId(), items, subtotal);
    }
}

package com.khanago.grocery.order.controller;

import com.khanago.grocery.order.dto.CheckoutRequestDto;
import com.khanago.grocery.order.dto.OrderDto;
import com.khanago.grocery.order.service.OrderService;
import com.khanago.grocery.common.dto.ApiSuccessResponse;
import com.khanago.grocery.common.enums.OrderStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customer/orders")
@RequiredArgsConstructor
public class CustomerOrderController {

    private final OrderService orderService;

    @PostMapping("/checkout")
    public OrderDto checkout(@Valid @RequestBody CheckoutRequestDto request) {
        return orderService.checkout(request);
    }

    @GetMapping
    public Page<OrderDto> myOrders(@RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "10") int size) {
        return orderService.myOrders(page, size);
    }

    @GetMapping("/{orderId}")
    public OrderDto getOrder(@PathVariable Long orderId) {
        return orderService.getOrder(orderId);
    }

    @PostMapping("/{orderId}/mark-paid")
    public ApiSuccessResponse<OrderDto> markOrderAsPaid(@PathVariable Long orderId) {
        OrderDto updated = orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED);
        return new ApiSuccessResponse<>("Order marked as paid", updated);
    }
}

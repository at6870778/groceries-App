package com.khanago.grocery.order.controller;

import com.khanago.grocery.common.enums.OrderStatus;
import com.khanago.grocery.delivery.dto.AssignmentDto;
import com.khanago.grocery.delivery.service.DeliveryService;
import com.khanago.grocery.order.dto.AdminOrderDetailDto;
import com.khanago.grocery.order.dto.AssignDeliveryRequestDto;
import com.khanago.grocery.order.dto.OrderStatusUpdateDto;
import com.khanago.grocery.order.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final OrderService orderService;
    private final DeliveryService deliveryService;

    @GetMapping
    public Page<AdminOrderDetailDto> orders(@RequestParam(required = false) String status,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size) {
        return orderService.adminOrdersDetail(status, page, size);
    }

    @PatchMapping("/{orderId}/status")
    public OrderDto updateStatus(@PathVariable Long orderId, @Valid @RequestBody OrderStatusUpdateDto request) {
        return orderService.updateOrderStatus(orderId, OrderStatus.valueOf(request.status().toUpperCase()));
    }

    @PostMapping("/{orderId}/assign")
    public AssignmentDto assign(@PathVariable Long orderId, @Valid @RequestBody AssignDeliveryRequestDto request) {
        return deliveryService.assignOrder(orderId, request.deliveryBoyId());
    }
}

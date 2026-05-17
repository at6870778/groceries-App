package com.khanago.grocery.delivery.controller;

import com.khanago.grocery.common.enums.DeliveryAssignmentStatus;
import com.khanago.grocery.delivery.dto.AssignmentDto;
import com.khanago.grocery.delivery.dto.DeliveryStatusUpdateDto;
import com.khanago.grocery.delivery.service.DeliveryService;
import com.khanago.grocery.order.dto.OrderDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/delivery")
@RequiredArgsConstructor
public class DeliveryController {

    private final DeliveryService deliveryService;

    @GetMapping("/orders")
    public List<OrderDto> myOrders(@RequestParam(required = false) String phone) {
        // Validate phone if provided
        if (phone != null && !phone.isEmpty()) {
            com.khanago.grocery.user.User currentUser = com.khanago.grocery.security.SecurityUtils.getCurrentUser();
            if (currentUser == null || !currentUser.getPhone().equals(phone)) {
                throw new com.khanago.grocery.common.exception.ApiException("Phone number does not match authenticated user");
            }
        }
        return deliveryService.myAssignedOrders();
    }

    @PatchMapping("/assignments/{assignmentId}/status")
    public AssignmentDto updateStatus(@PathVariable Long assignmentId, @Valid @RequestBody DeliveryStatusUpdateDto request) {
        DeliveryAssignmentStatus status = DeliveryAssignmentStatus.valueOf(request.status().toUpperCase());
        return deliveryService.updateDeliveryStatus(assignmentId, status);
    }
}

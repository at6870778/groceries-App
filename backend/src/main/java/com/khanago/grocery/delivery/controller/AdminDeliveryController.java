package com.khanago.grocery.delivery.controller;

import com.khanago.grocery.common.dto.ApiSuccessResponse;
import com.khanago.grocery.delivery.dto.AssignmentDto;
import com.khanago.grocery.delivery.dto.DeliveryAssignmentRequestDto;
import com.khanago.grocery.delivery.dto.DeliveryStatusUpdateDto;
import com.khanago.grocery.delivery.service.DeliveryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/delivery")
@RequiredArgsConstructor
public class AdminDeliveryController {

    private final DeliveryService deliveryService;

    @PostMapping("/assign")
    public ApiSuccessResponse<AssignmentDto> assignOrder(@Valid @RequestBody DeliveryAssignmentRequestDto request) {
        AssignmentDto result = deliveryService.assignOrder(request.orderId(), request.deliveryBoyId());
        return new ApiSuccessResponse<>("Order assigned to delivery boy", result);
    }

    @PatchMapping("/assignments/{assignmentId}/status")
    public ApiSuccessResponse<AssignmentDto> updateDeliveryStatus(@PathVariable Long assignmentId, @Valid @RequestBody DeliveryStatusUpdateDto request) {
        AssignmentDto result = deliveryService.adminUpdateDeliveryStatus(assignmentId, request.status());
        return new ApiSuccessResponse<>("Delivery status updated", result);
    }
}

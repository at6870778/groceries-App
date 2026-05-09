package com.khanago.grocery.delivery.dto;

public record AssignmentDto(Long assignmentId, Long orderId, Long deliveryBoyId, String status) {
}

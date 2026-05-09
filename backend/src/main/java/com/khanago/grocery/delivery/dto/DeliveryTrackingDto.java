package com.khanago.grocery.delivery.dto;

public record DeliveryTrackingDto(
        Long assignmentId,
        String deliveryStatus,
        Long deliveryBoyId,
        String deliveryBoyName,
        String deliveryBoyPhone,
        String orderStatus
) {
}

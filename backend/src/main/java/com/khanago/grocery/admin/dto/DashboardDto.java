package com.khanago.grocery.admin.dto;

public record DashboardDto(long totalCustomers, long totalDeliveryBoys, long activeProducts, long pendingOrders, long deliveredOrders) {
}

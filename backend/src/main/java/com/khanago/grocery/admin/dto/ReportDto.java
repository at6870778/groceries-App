package com.khanago.grocery.admin.dto;

import java.math.BigDecimal;

public record ReportDto(long totalOrders, long deliveredOrders, BigDecimal deliveredRevenue) {
}

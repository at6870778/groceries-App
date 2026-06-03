package com.khanago.grocery.admin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DateRangeSalesReportDto(
    LocalDate fromDate,
    LocalDate toDate,
    long totalOrders,
    BigDecimal totalRevenue,
    BigDecimal avgOrderValue,
    int totalDays,
    List<DailySalesDto> dailyBreakdown
) {
    public record DailySalesDto(
        LocalDate date,
        long orderCount,
        BigDecimal dailyRevenue,
        BigDecimal avgDailyOrderValue
    ) {
    }
}

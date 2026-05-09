package com.khanago.grocery.admin.dto;

import java.math.BigDecimal;

public record DailyOrderReportPointDto(String day, long orderCount, BigDecimal revenue) {
}

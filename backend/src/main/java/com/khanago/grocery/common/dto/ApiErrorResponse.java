package com.khanago.grocery.common.dto;

import java.util.List;

public record ApiErrorResponse(String code, String message, List<String> details) {
}

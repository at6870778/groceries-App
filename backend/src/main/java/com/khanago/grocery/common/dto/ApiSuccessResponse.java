package com.khanago.grocery.common.dto;

public record ApiSuccessResponse<T>(String message, T data) {
}

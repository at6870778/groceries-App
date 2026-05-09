package com.khanago.grocery.common.exception;

public class ApiException extends RuntimeException {

    public ApiException(String message) {
        super(message);
    }
}

package com.khanago.grocery.payment.controller;

import com.khanago.grocery.common.dto.ApiSuccessResponse;
import com.khanago.grocery.payment.dto.CreatePaymentOrderResponseDto;
import com.khanago.grocery.payment.dto.VerifyPaymentRequestDto;
import com.khanago.grocery.payment.dto.VerifyPaymentResponseDto;
import com.khanago.grocery.payment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customer/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/create-order")
    public ApiSuccessResponse<CreatePaymentOrderResponseDto> createOrder() {
        return new ApiSuccessResponse<>("Payment order created", paymentService.createOrderForCurrentUser());
    }

    @PostMapping("/verify")
    public ApiSuccessResponse<VerifyPaymentResponseDto> verify(@Valid @RequestBody VerifyPaymentRequestDto request) {
        return new ApiSuccessResponse<>("Payment verified", paymentService.verifyPayment(request));
    }
}

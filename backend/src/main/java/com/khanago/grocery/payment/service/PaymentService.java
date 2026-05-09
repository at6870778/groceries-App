package com.khanago.grocery.payment.service;

import com.khanago.grocery.cart.CartItem;
import com.khanago.grocery.cart.service.CartService;
import com.khanago.grocery.common.exception.ApiException;
import com.khanago.grocery.config.AppProperties;
import com.khanago.grocery.payment.dto.CreatePaymentOrderResponseDto;
import com.khanago.grocery.payment.dto.VerifyPaymentRequestDto;
import com.khanago.grocery.payment.dto.VerifyPaymentResponseDto;
import com.khanago.grocery.security.SecurityUtils;
import com.khanago.grocery.user.User;
import com.khanago.grocery.user.repository.UserRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final CartService cartService;
    private final UserRepository userRepository;
    private final AppProperties appProperties;

    public CreatePaymentOrderResponseDto createOrderForCurrentUser() {
        String keyId = appProperties.getRazorpay().getKeyId();
        String keySecret = appProperties.getRazorpay().getKeySecret();

        if (isBlank(keyId) || isBlank(keySecret) || keyId.contains("replace_me") || keySecret.contains("replace_with")) {
            throw new ApiException("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
        }

        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException("User not found"));

        List<CartItem> cartItems = cartService.getCartItems(userId);
        if (cartItems.isEmpty()) {
            throw new ApiException("Cart is empty.");
        }

        try {
            BigDecimal subtotal = cartItems.stream()
                    .map(i -> {
                        if (i.getUnitPrice() == null || i.getQuantity() == null) {
                            throw new ApiException("Invalid cart item price/quantity.");
                        }
                        return i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity()));
                    })
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal deliveryFee = new BigDecimal("20.00");
            BigDecimal total = subtotal.add(deliveryFee);
            int amountInPaise = total.multiply(new BigDecimal("100")).intValueExact();

            if (amountInPaise <= 0) {
                throw new ApiException("Invalid order amount for payment.");
            }

            RazorpayClient client = new RazorpayClient(keyId, keySecret);

            JSONObject options = new JSONObject();
            options.put("amount", amountInPaise);
            options.put("currency", "INR");
            options.put("receipt", "order_" + userId + "_" + System.currentTimeMillis());
            options.put("payment_capture", 1);

            Order order = client.orders.create(options);

            return new CreatePaymentOrderResponseDto(
                    keyId,
                    order.get("id"),
                    amountInPaise,
                    "INR",
                    "Order Kro",
                    "Grocery payment",
                    user.getPhone()
            );
        } catch (ApiException ex) {
            throw ex;
        } catch (ArithmeticException ex) {
            throw new ApiException("Unable to process amount for payment.");
        } catch (Exception ex) {
            throw new ApiException("Unable to create Razorpay order: " + ex.getMessage());
        }
    }

    public VerifyPaymentResponseDto verifyPayment(VerifyPaymentRequestDto request) {
        String keySecret = appProperties.getRazorpay().getKeySecret();
        if (isBlank(keySecret)) {
            throw new ApiException("Razorpay secret is missing.");
        }

        String payload = request.razorpayOrderId() + "|" + request.razorpayPaymentId();
        String expected = hmacSha256Hex(payload, keySecret);

        boolean ok = expected.equals(request.razorpaySignature());
        if (!ok) {
            throw new ApiException("Payment verification failed.");
        }

        return new VerifyPaymentResponseDto(true);
    }

    private String hmacSha256Hex(String payload, String secret) {
        try {
            Mac sha256 = Mac.getInstance("HmacSHA256");
            SecretKeySpec key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256.init(key);
            byte[] digest = sha256.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new ApiException("Failed to verify payment signature.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}

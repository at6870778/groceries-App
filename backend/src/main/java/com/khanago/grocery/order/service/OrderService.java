package com.khanago.grocery.order.service;

import com.khanago.grocery.cart.CartItem;
import com.khanago.grocery.cart.service.CartService;
import com.khanago.grocery.common.enums.OrderStatus;
import com.khanago.grocery.common.enums.PaymentMode;
import com.khanago.grocery.common.exception.ApiException;
import com.khanago.grocery.order.Order;
import com.khanago.grocery.order.OrderItem;
import com.khanago.grocery.order.dto.CheckoutRequestDto;
import com.khanago.grocery.order.dto.OrderDto;
import com.khanago.grocery.order.dto.OrderItemDto;
import com.khanago.grocery.order.repository.OrderItemRepository;
import com.khanago.grocery.order.repository.OrderRepository;
import com.khanago.grocery.security.SecurityUtils;
import com.khanago.grocery.user.Address;
import com.khanago.grocery.user.User;
import com.khanago.grocery.user.repository.AddressRepository;
import com.khanago.grocery.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final AddressRepository addressRepository;
    private final UserRepository userRepository;
    private final CartService cartService;

    public OrderDto checkout(CheckoutRequestDto request) {
        Long userId = SecurityUtils.getCurrentUserId();
        User customer = userRepository.findById(userId).orElseThrow(() -> new ApiException("User not found"));
        Address address = addressRepository.findById(request.addressId()).orElseThrow(() -> new ApiException("Address not found"));

        if (!address.getUser().getId().equals(userId)) {
            throw new ApiException("Address does not belong to current user.");
        }

        List<CartItem> cartItems = cartService.getCartItems(userId);
        if (cartItems.isEmpty()) {
            throw new ApiException("Cart is empty.");
        }

        BigDecimal subtotal = cartItems.stream()
                .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal deliveryFee = new BigDecimal("20.00");

        Order order = new Order();
        order.setCustomer(customer);
        order.setAddress(address);
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentMode(request.paymentMode() == null ? PaymentMode.COD : request.paymentMode());
        order.setSubtotal(subtotal);
        order.setDeliveryFee(deliveryFee);
        order.setTotalAmount(subtotal.add(deliveryFee));
        order.setNotes(request.notes());
        order = orderRepository.save(order);

        Order finalOrder = order;
        List<OrderItem> orderItems = cartItems.stream().map(ci -> {
            OrderItem oi = new OrderItem();
            oi.setOrder(finalOrder);
            oi.setProduct(ci.getProduct());
            oi.setProductName(ci.getProduct().getName());
            oi.setUnit(ci.getProduct().getUnit());
            oi.setQuantity(ci.getQuantity());
            oi.setUnitPrice(ci.getUnitPrice());
            oi.setLineTotal(ci.getUnitPrice().multiply(BigDecimal.valueOf(ci.getQuantity())));
            return oi;
        }).toList();

        orderItemRepository.saveAll(orderItems);
        cartService.clearCart(userId);

        return toDto(order, orderItems);
    }

    public Page<OrderDto> myOrders(int page, int size) {
        return orderRepository.findByCustomerId(SecurityUtils.getCurrentUserId(), PageRequest.of(page, size))
                .map(this::toDto);
    }

    public OrderDto getOrder(Long orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ApiException("Order not found"));
        if (!order.getCustomer().getId().equals(SecurityUtils.getCurrentUserId())) {
            throw new ApiException("Order does not belong to current user.");
        }
        return toDto(order);
    }

    public OrderDto getOrderForDelivery(Long orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ApiException("Order not found"));
        return toDto(order);
    }

    public Page<OrderDto> adminOrders(String status, int page, int size) {
        if (status == null || status.isBlank()) {
            return orderRepository.findAll(PageRequest.of(page, size)).map(this::toDto);
        }
        OrderStatus orderStatus = OrderStatus.valueOf(status.toUpperCase());
        return orderRepository.findByStatus(orderStatus, PageRequest.of(page, size)).map(this::toDto);
    }

    public OrderDto updateOrderStatus(Long orderId, OrderStatus status) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ApiException("Order not found"));
        order.setStatus(status);
        return toDto(orderRepository.save(order));
    }

    private OrderDto toDto(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        return toDto(order, items);
    }

    private OrderDto toDto(Order order, List<OrderItem> items) {
        return new OrderDto(
                order.getId(),
                null,
                order.getStatus().name(),
                order.getPaymentMode().name(),
                order.getSubtotal(),
                order.getDeliveryFee(),
                order.getTotalAmount(),
                order.getNotes(),
                order.getCreatedAt(),
                items.stream().map(i -> new OrderItemDto(i.getProductName(), i.getUnit(), i.getQuantity(), i.getUnitPrice(), i.getLineTotal())).toList()
        );
    }
}

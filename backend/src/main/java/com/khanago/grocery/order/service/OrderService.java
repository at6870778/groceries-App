package com.khanago.grocery.order.service;

import com.khanago.grocery.cart.CartItem;
import com.khanago.grocery.cart.service.CartService;
import com.khanago.grocery.common.enums.OrderStatus;
import com.khanago.grocery.common.enums.PaymentMode;
import com.khanago.grocery.common.exception.ApiException;
import com.khanago.grocery.common.service.AdminNotificationService;
import com.khanago.grocery.common.service.FcmService;
import com.khanago.grocery.notification.UserNotificationService;
import com.khanago.grocery.delivery.DeliveryAssignment;
import com.khanago.grocery.delivery.repository.DeliveryAssignmentRepository;
import com.khanago.grocery.delivery.service.DeliveryFeeService;
import com.khanago.grocery.order.Order;
import com.khanago.grocery.order.OrderItem;
import com.khanago.grocery.order.dto.AdminOrderDetailDto;
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
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final AddressRepository addressRepository;
    private final UserRepository userRepository;
    private final DeliveryAssignmentRepository deliveryAssignmentRepository;
    private final CartService cartService;
    private final DeliveryFeeService deliveryFeeService;
    private final AdminNotificationService adminNotificationService;
    private final FcmService fcmService;
    private final UserNotificationService userNotificationService;

    @Transactional
    public OrderDto checkout(CheckoutRequestDto request) {
        Long userId = SecurityUtils.getCurrentUserId();
        User customer = userRepository.findById(userId).orElseThrow(() -> new ApiException("User not found"));
        Address address = (request.addressId() != null)
                ? addressRepository.findById(request.addressId()).orElseThrow(() -> new ApiException("Address not found"))
                : null;

        if (address != null && !address.getUser().getId().equals(userId)) {
            throw new ApiException("Address does not belong to current user.");
        }

        List<CartItem> cartItems = cartService.getCartItems(userId);
        if (cartItems.isEmpty()) {
            throw new ApiException("Cart is empty.");
        }

        BigDecimal subtotal = cartItems.stream()
                .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal deliveryFee = deliveryFeeService.calculateFeeByAmount(subtotal);

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

        OrderDto orderDto = toDto(order, orderItems);
        adminNotificationService.notifyNewOrder(orderDto);
        return orderDto;
    }

    @Transactional(readOnly = true)
    public java.util.List<OrderDto> myOrders() {
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(SecurityUtils.getCurrentUserId())
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public OrderDto getOrder(Long orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ApiException("Order not found"));
        if (!order.getCustomer().getId().equals(SecurityUtils.getCurrentUserId())) {
            throw new ApiException("Order does not belong to current user.");
        }
        return toDto(order);
    }

    @Transactional(readOnly = true)
    public OrderDto getOrderForDelivery(Long orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ApiException("Order not found"));
        return toDto(order);
    }

    @Transactional(readOnly = true)
    public Page<OrderDto> adminOrders(String status, int page, int size) {
        if (status == null || status.isBlank()) {
            return orderRepository.findAll(PageRequest.of(page, size)).map(this::toDto);
        }
        OrderStatus orderStatus = OrderStatus.valueOf(status.toUpperCase());
        return orderRepository.findByStatus(orderStatus, PageRequest.of(page, size)).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<AdminOrderDetailDto> adminOrdersDetail(String status, int page, int size) {
        Page<Order> orders;
        if (status == null || status.isBlank()) {
            orders = orderRepository.findAll(PageRequest.of(page, size));
        } else {
            OrderStatus orderStatus = OrderStatus.valueOf(status.toUpperCase());
            orders = orderRepository.findByStatus(orderStatus, PageRequest.of(page, size));
        }
        return orders.map(this::toAdminDetailDto);
    }

    @Transactional
    public OrderDto updateOrderStatus(Long orderId, OrderStatus status) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ApiException("Order not found"));
        order.setStatus(status);
        OrderDto dto = toDto(orderRepository.save(order));
        // Send push notification to customer
        String fcmToken = order.getCustomer() != null ? order.getCustomer().getFcmToken() : null;
        String msg = orderStatusMessage(status, orderId);
        String title = orderStatusTitle(status);
        String imageUrl = orderStatusImageUrl(status);
        if (fcmToken != null) {
            fcmService.sendToToken(fcmToken, title, msg, "OPEN_ORDERS", imageUrl);
        }
        // Always persist notification in DB
        userNotificationService.save(order.getCustomer(), title, msg, "ORDER");
        return dto;
    }

    private String buildAddressString(Address addr) {
        if (addr == null) return "N/A";
        StringBuilder sb = new StringBuilder();
        sb.append(addr.getLine1());
        if (addr.getLine2() != null && !addr.getLine2().isBlank()) sb.append(", ").append(addr.getLine2());
        if (addr.getLandmark() != null && !addr.getLandmark().isBlank()) sb.append(", Near: ").append(addr.getLandmark());
        sb.append(", ").append(addr.getCity());
        if (addr.getState() != null && !addr.getState().isBlank()) sb.append(", ").append(addr.getState());
        sb.append(" - ").append(addr.getPostalCode());
        return sb.toString();
    }

    private String orderStatusImageUrl(OrderStatus status) {
        // Use a publicly hosted image per status — replace these URLs with your own CDN/Cloudinary images
        return switch (status) {
            case CONFIRMED        -> "https://res.cloudinary.com/demo/image/upload/v1/order_confirmed.png";
            case PREPARING        -> "https://res.cloudinary.com/demo/image/upload/v1/order_preparing.png";
            case OUT_FOR_DELIVERY -> "https://res.cloudinary.com/demo/image/upload/v1/order_delivery.png";
            case DELIVERED        -> "https://res.cloudinary.com/demo/image/upload/v1/order_delivered.png";
            default               -> null;
        };
    }

    private String orderStatusTitle(OrderStatus status) {
        return switch (status) {
            case CONFIRMED        -> "Order Confirmed 🎉";
            case PREPARING        -> "Order Being Prepared 👨‍🍳";
            case OUT_FOR_DELIVERY -> "Out for Delivery 🛵";
            case DELIVERED        -> "Order Delivered ✅";
            case CANCELLED        -> "Order Cancelled";
            default               -> "Order Update";
        };
    }

    private String orderStatusMessage(OrderStatus status, Long orderId) {
        return switch (status) {
            case CONFIRMED       -> "Your order #" + orderId + " has been confirmed! We're preparing it.";
            case PREPARING       -> "Your order #" + orderId + " is being prepared.";
            case OUT_FOR_DELIVERY -> "Your order #" + orderId + " is on its way!";
            case DELIVERED       -> "Your order #" + orderId + " has been delivered. Enjoy!";
            case CANCELLED       -> "Your order #" + orderId + " has been cancelled.";
            default              -> "Your order #" + orderId + " status updated to " + status.name() + ".";
        };
    }

    private OrderDto toDto(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        return toDto(order, items);
    }

    private OrderDto toDto(Order order, List<OrderItem> items) {
        String customerName = (order.getCustomer() != null && order.getCustomer().getFullName() != null)
                ? order.getCustomer().getFullName() : "Unknown";
        String customerPhone = (order.getCustomer() != null && order.getCustomer().getPhone() != null)
                ? order.getCustomer().getPhone() : "N/A";
        String address = buildAddressString(order.getAddress());
        return new OrderDto(
                order.getId(),
                null,
                null,
                order.getStatus().name(),
                order.getPaymentMode().name(),
                order.getSubtotal(),
                order.getDeliveryFee(),
                order.getTotalAmount(),
                order.getNotes(),
                order.getCreatedAt(),
                items.stream().map(i -> new OrderItemDto(i.getProductName(), i.getUnit(), i.getQuantity(), i.getUnitPrice(), i.getLineTotal())).toList(),
                customerName,
                customerPhone,
                address
        );
    }

    private AdminOrderDetailDto toAdminDetailDto(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        Optional<DeliveryAssignment> assignment = deliveryAssignmentRepository.findByOrderId(order.getId());

        String deliveryBoyName = "Not Assigned";
        String deliveryStatus = "NOT_ASSIGNED";
        Long assignmentId = null;

        if (assignment.isPresent()) {
            DeliveryAssignment da = assignment.get();
            assignmentId = da.getId();
            if (da.getStatus() != null) {
                deliveryStatus = da.getStatus().name();
            }
            if (da.getDeliveryBoy() != null && da.getDeliveryBoy().getFullName() != null && !da.getDeliveryBoy().getFullName().isBlank()) {
                deliveryBoyName = da.getDeliveryBoy().getFullName();
            }
        }

        String address = buildAddressString(order.getAddress());

        String customerName = (order.getCustomer() != null && order.getCustomer().getFullName() != null)
                ? order.getCustomer().getFullName()
                : "Unknown Customer";
        String customerPhone = (order.getCustomer() != null && order.getCustomer().getPhone() != null)
                ? order.getCustomer().getPhone()
                : "N/A";
        String status = order.getStatus() != null ? order.getStatus().name() : "PENDING";
        String paymentMode = order.getPaymentMode() != null ? order.getPaymentMode().name() : "N/A";
        
        return new AdminOrderDetailDto(
                order.getId(),
                customerName,
                customerPhone,
                address,
                status,
                paymentMode,
                order.getSubtotal(),
                order.getDeliveryFee(),
                order.getTotalAmount(),
                order.getNotes(),
                order.getCreatedAt(),
                assignmentId,
                deliveryBoyName,
                deliveryStatus,
                items.stream().map(i -> new OrderItemDto(i.getProductName(), i.getUnit(), i.getQuantity(), i.getUnitPrice(), i.getLineTotal())).toList()
        );
    }
}

package com.khanago.grocery.delivery.service;

import com.khanago.grocery.common.enums.DeliveryAssignmentStatus;
import com.khanago.grocery.common.enums.OrderStatus;
import com.khanago.grocery.common.exception.ApiException;
import com.khanago.grocery.common.service.AdminNotificationService;
import com.khanago.grocery.delivery.DeliveryAssignment;
import com.khanago.grocery.delivery.dto.AssignmentDto;
import com.khanago.grocery.delivery.dto.DeliveryTrackingDto;
import com.khanago.grocery.delivery.repository.DeliveryAssignmentRepository;
import com.khanago.grocery.order.Order;
import com.khanago.grocery.order.dto.OrderDto;
import com.khanago.grocery.order.service.OrderService;
import com.khanago.grocery.order.repository.OrderRepository;
import com.khanago.grocery.security.SecurityUtils;
import com.khanago.grocery.user.User;
import com.khanago.grocery.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DeliveryService {

    private final DeliveryAssignmentRepository assignmentRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final OrderService orderService;
    private final AdminNotificationService adminNotificationService;

    @Transactional
    public AssignmentDto assignOrder(Long orderId, Long deliveryBoyId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ApiException("Order not found"));
        User deliveryBoy = userRepository.findById(deliveryBoyId).orElseThrow(() -> new ApiException("Delivery boy not found"));

        DeliveryAssignment assignment = assignmentRepository.findByOrderId(orderId).orElseGet(DeliveryAssignment::new);
        assignment.setOrder(order);
        assignment.setDeliveryBoy(deliveryBoy);
        assignment.setStatus(DeliveryAssignmentStatus.ASSIGNED);
        assignment = assignmentRepository.save(assignment);

        orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED);

        // Notify admin group + delivery boy (async, won't delay response)
        OrderDto orderDto = orderService.getOrderForDelivery(orderId);
        adminNotificationService.notifyDeliveryBoyAssigned(
                orderDto,
                deliveryBoy.getFullName(),
                deliveryBoy.getTelegramChatId()
        );

        return new AssignmentDto(assignment.getId(), orderId, deliveryBoyId, assignment.getStatus().name());
    }

    @Transactional(readOnly = true)
    public List<OrderDto> myAssignedOrders() {
        Long deliveryBoyId = SecurityUtils.getCurrentUserId();
        List<DeliveryAssignmentStatus> activeStatuses = List.of(
                DeliveryAssignmentStatus.ASSIGNED,
                DeliveryAssignmentStatus.PICKED,
                DeliveryAssignmentStatus.OUT_FOR_DELIVERY
        );

        boolean isAdmin = SecurityUtils.hasRole("ADMIN");
        List<DeliveryAssignment> assignments = isAdmin
            ? assignmentRepository.findByStatusIn(activeStatuses)
            : assignmentRepository.findByDeliveryBoyIdAndStatusIn(deliveryBoyId, activeStatuses);

        return assignments.stream()
                .map(a -> {
                    OrderDto base = orderService.getOrderForDelivery(a.getOrder().getId());
                    return new OrderDto(
                            base.id(),
                            a.getId(),
                            a.getStatus().name(),
                            base.status(),
                            base.paymentMode(),
                            base.subtotal(),
                            base.deliveryFee(),
                            base.totalAmount(),
                            base.notes(),
                            base.createdAt(),
                            base.items(),
                            base.customerName(),
                            base.customerPhone(),
                            base.deliveryAddress()
                    );
                })
                .toList();
    }

    @Transactional
    public AssignmentDto updateDeliveryStatus(Long assignmentId, DeliveryAssignmentStatus status) {
        DeliveryAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ApiException("Assignment not found"));

        boolean isAdmin = SecurityUtils.hasRole("ADMIN");
        if (!isAdmin && !assignment.getDeliveryBoy().getId().equals(SecurityUtils.getCurrentUserId())) {
            throw new ApiException("Assignment does not belong to current delivery boy.");
        }

        assignment.setStatus(status);
        assignment = assignmentRepository.save(assignment);

        OrderDto orderDto = orderService.getOrderForDelivery(assignment.getOrder().getId());
        String deliveryBoyName = assignment.getDeliveryBoy().getFullName();

        if (status == DeliveryAssignmentStatus.PICKED) {
            orderService.updateOrderStatus(assignment.getOrder().getId(), OrderStatus.PREPARING);
            // Notify admin that order is picked
            adminNotificationService.notifyOrderPicked(orderDto, deliveryBoyName);
        } else if (status == DeliveryAssignmentStatus.OUT_FOR_DELIVERY) {
            orderService.updateOrderStatus(assignment.getOrder().getId(), OrderStatus.OUT_FOR_DELIVERY);
            // Notify admin that order is out for delivery
            adminNotificationService.notifyOrderOutForDelivery(orderDto, deliveryBoyName);
        } else if (status == DeliveryAssignmentStatus.DELIVERED) {
            orderService.updateOrderStatus(assignment.getOrder().getId(), OrderStatus.DELIVERED);
            // Notify admin that delivery is completed
            adminNotificationService.notifyOrderDelivered(orderDto, deliveryBoyName);
        }

        return new AssignmentDto(assignment.getId(), assignment.getOrder().getId(), assignment.getDeliveryBoy().getId(), assignment.getStatus().name());
    }

    public AssignmentDto updateDeliveryStatus(Long assignmentId, String statusStr) {
        DeliveryAssignmentStatus status = DeliveryAssignmentStatus.valueOf(statusStr.toUpperCase());
        return updateDeliveryStatus(assignmentId, status);
    }

    @Transactional
    public AssignmentDto adminUpdateDeliveryStatus(Long assignmentId, String statusStr) {
        DeliveryAssignmentStatus status = DeliveryAssignmentStatus.valueOf(statusStr.toUpperCase());
        DeliveryAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ApiException("Assignment not found"));

        assignment.setStatus(status);
        assignment = assignmentRepository.save(assignment);

        if (status == DeliveryAssignmentStatus.PICKED) {
            orderService.updateOrderStatus(assignment.getOrder().getId(), OrderStatus.PREPARING);
        } else if (status == DeliveryAssignmentStatus.OUT_FOR_DELIVERY) {
            orderService.updateOrderStatus(assignment.getOrder().getId(), OrderStatus.OUT_FOR_DELIVERY);
        } else if (status == DeliveryAssignmentStatus.DELIVERED) {
            orderService.updateOrderStatus(assignment.getOrder().getId(), OrderStatus.DELIVERED);
        }

        return new AssignmentDto(assignment.getId(), assignment.getOrder().getId(), assignment.getDeliveryBoy().getId(), assignment.getStatus().name());
    }

    @Transactional(readOnly = true)
    public DeliveryTrackingDto getDeliveryTracking(Long orderId) {
        DeliveryAssignment assignment = assignmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ApiException("Delivery assignment not found for this order"));

        Order order = assignment.getOrder();
        return new DeliveryTrackingDto(
                assignment.getId(),
                assignment.getStatus().name(),
                assignment.getDeliveryBoy().getId(),
                assignment.getDeliveryBoy().getFullName(),
                assignment.getDeliveryBoy().getPhone(),
                order.getStatus().name()
        );
    }
}

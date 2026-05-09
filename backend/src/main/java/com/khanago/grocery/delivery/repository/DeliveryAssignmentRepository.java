package com.khanago.grocery.delivery.repository;

import com.khanago.grocery.common.enums.DeliveryAssignmentStatus;
import com.khanago.grocery.delivery.DeliveryAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeliveryAssignmentRepository extends JpaRepository<DeliveryAssignment, Long> {
    Optional<DeliveryAssignment> findByOrderId(Long orderId);

    List<DeliveryAssignment> findByDeliveryBoyIdAndStatusIn(Long deliveryBoyId, List<DeliveryAssignmentStatus> statuses);
}

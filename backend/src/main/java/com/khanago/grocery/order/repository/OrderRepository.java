package com.khanago.grocery.order.repository;

import com.khanago.grocery.common.enums.OrderStatus;
import com.khanago.grocery.order.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Page<Order> findByCustomerId(Long customerId, Pageable pageable);

    List<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    long countByStatus(OrderStatus status);

    @Query(value = """
            SELECT CAST(created_at AS DATE) AS report_date,
                   COUNT(*) AS orderCount,
                   COALESCE(SUM(total_amount), 0) AS revenue
            FROM orders
            WHERE status = 'DELIVERED' AND created_at >= :fromDate
            GROUP BY CAST(created_at AS DATE)
            ORDER BY CAST(created_at AS DATE)
            """, nativeQuery = true)
    List<Object[]> findDeliveredSummaryByDay(LocalDateTime fromDate);
}

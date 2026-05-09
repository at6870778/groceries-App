package com.khanago.grocery.admin.service;

import com.khanago.grocery.admin.dto.AdminUserDto;
import com.khanago.grocery.admin.dto.AdminCreateUserDto;
import com.khanago.grocery.admin.dto.DailyOrderReportPointDto;
import com.khanago.grocery.admin.dto.DashboardDto;
import com.khanago.grocery.admin.dto.ReportDto;
import com.khanago.grocery.catalog.repository.ProductRepository;
import com.khanago.grocery.common.enums.OrderStatus;
import com.khanago.grocery.common.enums.RoleName;
import com.khanago.grocery.common.exception.ApiException;
import com.khanago.grocery.order.repository.OrderRepository;
import com.khanago.grocery.user.Role;
import com.khanago.grocery.user.User;
import com.khanago.grocery.user.repository.RoleRepository;
import com.khanago.grocery.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public DashboardDto getDashboard() {
        return new DashboardDto(
                userRepository.countByRoles_Name(RoleName.CUSTOMER),
                userRepository.countByRoles_Name(RoleName.DELIVERY_BOY),
                productRepository.countByActiveTrue(),
                orderRepository.countByStatus(OrderStatus.PENDING),
                orderRepository.countByStatus(OrderStatus.DELIVERED)
        );
    }

    public Page<AdminUserDto> listCustomers(int page, int size) {
        return userRepository.findByRoles_Name(RoleName.CUSTOMER, PageRequest.of(page, size)).map(this::toDto);
    }

    public Page<AdminUserDto> listDeliveryBoys(int page, int size) {
        return userRepository.findByRoles_Name(RoleName.DELIVERY_BOY, PageRequest.of(page, size)).map(this::toDto);
    }

    public ReportDto report() {
        long totalOrders = orderRepository.count();
        long deliveredOrders = orderRepository.countByStatus(OrderStatus.DELIVERED);
        BigDecimal deliveredRevenue = orderRepository.findByStatus(OrderStatus.DELIVERED, PageRequest.of(0, 2000))
                .stream()
                .map(o -> o.getTotalAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new ReportDto(totalOrders, deliveredOrders, deliveredRevenue);
    }

    public List<DailyOrderReportPointDto> dailyReport(int days) {
        LocalDateTime from = LocalDate.now().minusDays(Math.max(days, 1) - 1L).atStartOfDay();
        return orderRepository.findDeliveredSummaryByDay(from).stream()
                .map(row -> new DailyOrderReportPointDto(
                        row[0].toString(),
                        ((Number) row[1]).longValue(),
                        new BigDecimal(row[2].toString())
                ))
                .toList();
    }

    public AdminUserDto createCustomer(AdminCreateUserDto request) {
        return createUserByRole(request, RoleName.CUSTOMER);
    }

    public AdminUserDto createDeliveryBoy(AdminCreateUserDto request) {
        return createUserByRole(request, RoleName.DELIVERY_BOY);
    }

    public AdminUserDto updateUserActive(Long userId, boolean active) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException("User not found"));
        user.setActive(active);
        return toDto(userRepository.save(user));
    }

    private AdminUserDto createUserByRole(AdminCreateUserDto request, RoleName roleName) {
        if (userRepository.findByPhone(request.phone()).isPresent()) {
            throw new ApiException("User already exists with this phone.");
        }

        Role role = roleRepository.findByName(roleName).orElseThrow(() -> new ApiException("Role not configured."));

        User user = new User();
        user.setFullName(request.fullName());
        user.setPhone(request.phone());
        user.setPasswordHash(passwordEncoder.encode(request.phone()));
        user.setActive(true);
        user.setRoles(Set.of(role));

        return toDto(userRepository.save(user));
    }

    private AdminUserDto toDto(User user) {
        return new AdminUserDto(
                user.getId(),
                user.getFullName(),
                user.getPhone(),
                user.isActive(),
                user.getRoles().stream().map(r -> r.getName().name()).toList()
        );
    }
}

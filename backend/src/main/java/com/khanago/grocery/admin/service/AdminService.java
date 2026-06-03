package com.khanago.grocery.admin.service;

import com.khanago.grocery.admin.dto.AdminUserDto;
import com.khanago.grocery.admin.dto.AdminCreateUserDto;
import com.khanago.grocery.admin.dto.DailyOrderReportPointDto;
import com.khanago.grocery.admin.dto.DashboardDto;
import com.khanago.grocery.admin.dto.DateRangeSalesReportDto;
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

    public Page<AdminUserDto> listAllUsers(int page, int size) {
        return userRepository.findAll(PageRequest.of(page, size)).map(this::toDto);
    }

    public List<AdminUserDto> searchUsers(String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return List.of();
        }
        String term = searchTerm.toLowerCase().trim();
        // Find all users matching name or phone (case-insensitive)
        return userRepository.findAll().stream()
                .filter(u -> (u.getFullName() != null && u.getFullName().toLowerCase().contains(term))
                        || u.getPhone().toLowerCase().contains(term))
                .map(this::toDto)
                .toList();
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

    public DateRangeSalesReportDto salesReportByDateRange(LocalDate fromDate, LocalDate toDate) {
        // Validate date range
        if (fromDate.isAfter(toDate)) {
            throw new ApiException("From date must be before or equal to To date");
        }

        LocalDateTime fromDateTime = fromDate.atStartOfDay();
        LocalDateTime toDateTime = toDate.atStartOfDay().plusDays(1).minusNanos(1); // End of day

        // Get total count and revenue
        long totalOrders = orderRepository.countDeliveredByDateRange(fromDateTime, toDateTime);
        BigDecimal totalRevenue = orderRepository.sumRevenueByDateRange(fromDateTime, toDateTime);
        if (totalRevenue == null) {
            totalRevenue = BigDecimal.ZERO;
        }

        // Calculate average order value
        BigDecimal avgOrderValue = totalOrders > 0 
            ? totalRevenue.divide(new BigDecimal(totalOrders), 2, java.math.RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        // Get daily breakdown
        List<DateRangeSalesReportDto.DailySalesDto> dailyBreakdown = orderRepository
            .findDeliveredSummaryByDateRange(fromDateTime, toDateTime).stream()
            .map(row -> {
                LocalDate date = LocalDate.parse(row[0].toString());
                long orderCount = ((Number) row[1]).longValue();
                BigDecimal dailyRevenue = new BigDecimal(row[2].toString());
                BigDecimal avgDailyOrderValue = orderCount > 0
                    ? dailyRevenue.divide(new BigDecimal(orderCount), 2, java.math.RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
                return new DateRangeSalesReportDto.DailySalesDto(date, orderCount, dailyRevenue, avgDailyOrderValue);
            })
            .toList();

        int totalDays = (int) java.time.temporal.ChronoUnit.DAYS.between(fromDate, toDate) + 1;

        return new DateRangeSalesReportDto(fromDate, toDate, totalOrders, totalRevenue, avgOrderValue, totalDays, dailyBreakdown);
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

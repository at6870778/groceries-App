package com.khanago.grocery.admin.controller;

import com.khanago.grocery.admin.dto.AdminUserDto;
import com.khanago.grocery.admin.dto.AdminCreateUserDto;
import com.khanago.grocery.admin.dto.AdminUserActiveUpdateDto;
import com.khanago.grocery.admin.dto.DailyOrderReportPointDto;
import com.khanago.grocery.admin.dto.DashboardDto;
import com.khanago.grocery.admin.dto.DateRangeSalesReportDto;
import com.khanago.grocery.admin.dto.ReportDto;
import com.khanago.grocery.admin.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/dashboard")
    public DashboardDto dashboard() {
        return adminService.getDashboard();
    }

    @GetMapping("/customers")
    public Page<AdminUserDto> customers(@RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size) {
        return adminService.listCustomers(page, size);
    }

    @GetMapping("/delivery-boys")
    public Page<AdminUserDto> deliveryBoys(@RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size) {
        return adminService.listDeliveryBoys(page, size);
    }

    @GetMapping("/users")
    public Page<AdminUserDto> allUsers(@RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        return adminService.listAllUsers(page, size);
    }

    @GetMapping("/users/search")
    public java.util.List<AdminUserDto> searchUsers(@RequestParam String query) {
        return adminService.searchUsers(query);
    }

    @GetMapping("/reports")
    public ReportDto reports() {
        return adminService.report();
    }

    @GetMapping("/reports/daily")
    public List<DailyOrderReportPointDto> dailyReports(@RequestParam(defaultValue = "7") int days) {
        return adminService.dailyReport(days);
    }

    @GetMapping("/reports/sales")
    public DateRangeSalesReportDto salesReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return adminService.salesReportByDateRange(fromDate, toDate);
    }

    @PostMapping("/customers")
    public AdminUserDto createCustomer(@Valid @RequestBody AdminCreateUserDto request) {
        return adminService.createCustomer(request);
    }

    @PostMapping("/delivery-boys")
    public AdminUserDto createDeliveryBoy(@Valid @RequestBody AdminCreateUserDto request) {
        return adminService.createDeliveryBoy(request);
    }

    @PatchMapping("/users/{userId}/active")
    public AdminUserDto updateUserActive(@PathVariable Long userId, @Valid @RequestBody AdminUserActiveUpdateDto request) {
        return adminService.updateUserActive(userId, request.active());
    }
}

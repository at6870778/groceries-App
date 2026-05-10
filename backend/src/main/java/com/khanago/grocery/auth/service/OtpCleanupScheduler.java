package com.khanago.grocery.auth.service;

import com.khanago.grocery.auth.repository.OtpAuditLogRepository;
import com.khanago.grocery.auth.repository.OtpRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Nightly housekeeping for OTP data:
 *  - otp_records older than 7 days are deleted
 *  - otp_audit_logs older than 30 days are deleted
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OtpCleanupScheduler {

    private final OtpRecordRepository     otpRecordRepository;
    private final OtpAuditLogRepository   otpAuditLogRepository;

    @Scheduled(cron = "0 0 3 * * *") // 3:00 AM every day
    @Transactional
    public void cleanupOtpData() {
        LocalDateTime otpCutoff   = LocalDateTime.now().minusDays(7);
        LocalDateTime auditCutoff = LocalDateTime.now().minusDays(30);

        otpRecordRepository.deleteOlderThan(otpCutoff);
        otpAuditLogRepository.deleteOlderThan(auditCutoff);

        log.info("OTP cleanup complete – records before {}, audit logs before {}", otpCutoff, auditCutoff);
    }
}

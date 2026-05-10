package com.khanago.grocery.auth.repository;

import com.khanago.grocery.auth.OtpAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

public interface OtpAuditLogRepository extends JpaRepository<OtpAuditLog, Long> {

    @Modifying
    @Transactional
    @Query("DELETE FROM OtpAuditLog o WHERE o.createdAt < :before")
    void deleteOlderThan(LocalDateTime before);
}

package com.khanago.grocery.auth.repository;

import com.khanago.grocery.auth.OtpRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

public interface OtpRecordRepository extends JpaRepository<OtpRecord, Long> {

    /** Latest active (non-used, non-invalidated, not yet expired) OTP for this phone. */
    @Query("SELECT o FROM OtpRecord o WHERE o.phone = :phone AND o.used = false AND o.invalidated = false AND o.expiresAt > :now ORDER BY o.createdAt DESC LIMIT 1")
    Optional<OtpRecord> findActiveOtp(String phone, LocalDateTime now);

    /** Most recent record regardless of state (for resend-cooldown check). */
    @Query("SELECT o FROM OtpRecord o WHERE o.phone = :phone ORDER BY o.createdAt DESC LIMIT 1")
    Optional<OtpRecord> findLatestByPhone(String phone);

    /** Count all requests for this phone in the given window (for rate limiting). */
    @Query("SELECT COUNT(o) FROM OtpRecord o WHERE o.phone = :phone AND o.createdAt > :since")
    long countRequestsSince(String phone, LocalDateTime since);

    /** Invalidate any active OTPs before issuing a fresh one. */
    @Modifying
    @Transactional
    @Query("UPDATE OtpRecord o SET o.invalidated = true WHERE o.phone = :phone AND o.used = false AND o.invalidated = false")
    void invalidateAllActiveForPhone(String phone);

    /** Housekeeping: purge old records. */
    @Modifying
    @Transactional
    @Query("DELETE FROM OtpRecord o WHERE o.createdAt < :before")
    void deleteOlderThan(LocalDateTime before);
}

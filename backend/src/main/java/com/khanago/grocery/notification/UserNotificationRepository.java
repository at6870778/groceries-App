package com.khanago.grocery.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {

    List<UserNotification> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserId(Long userId);

    @Modifying
    @Query("DELETE FROM UserNotification n WHERE n.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}

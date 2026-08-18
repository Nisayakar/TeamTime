package com.teamtime.repository;

import com.teamtime.entity.Notification;
import com.teamtime.entity.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);

    long countByRecipientIdAndReadFalse(Long recipientId);

    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);

    void deleteByRecipientId(Long recipientId);

    @Modifying
    @Query("""
            update Notification notification
            set notification.read = true
            where notification.recipient.id = :recipientId
            """)
    int markAllAsReadForRecipient(@Param("recipientId") Long recipientId);

    @Modifying
    @Query("delete from Notification n where n.recipient.id = :recipientId and n.type = :type and n.relatedEntityId = :relatedEntityId")
    void deleteByRecipientAndTypeAndRelatedEntityId(@Param("recipientId") Long recipientId, @Param("type") NotificationType type, @Param("relatedEntityId") Long relatedEntityId);
}


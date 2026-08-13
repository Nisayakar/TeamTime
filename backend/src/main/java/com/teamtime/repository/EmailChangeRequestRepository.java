package com.teamtime.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teamtime.entity.EmailChangeRequest;

public interface EmailChangeRequestRepository extends JpaRepository<EmailChangeRequest, Long> {
    Optional<EmailChangeRequest> findByUserIdAndNewEmailIgnoreCase(Long userId, String newEmail);

    void deleteByUserId(Long userId);
}

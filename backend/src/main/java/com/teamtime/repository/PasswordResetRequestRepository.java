package com.teamtime.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teamtime.entity.PasswordResetRequest;

public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, Long> {
    Optional<PasswordResetRequest> findByEmail(String email);
}

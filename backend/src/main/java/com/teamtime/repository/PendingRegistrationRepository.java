package com.teamtime.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teamtime.entity.PendingRegistration;

public interface PendingRegistrationRepository extends JpaRepository<PendingRegistration, Long> {
    Optional<PendingRegistration> findByEmail(String email);

    void deleteByEmail(String email);
}

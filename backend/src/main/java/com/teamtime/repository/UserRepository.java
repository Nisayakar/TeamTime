package com.teamtime.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teamtime.entity.User;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
        Optional<User> findByEmail(String email);
        Optional<User> findByEmailIgnoreCase(String email);
        boolean existsByEmailIgnoreCase(String email);
        boolean existsByUsernameIgnoreCase(String username);
        @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR LOWER(u.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR LOWER(u.surname) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
        List<User> searchUsers(@org.springframework.data.repository.query.Param("searchTerm") String searchTerm, org.springframework.data.domain.Pageable pageable);
//Spring Data JPA metodun ismine bakarak arka planda otomatik SQL oluşturuyor.
}

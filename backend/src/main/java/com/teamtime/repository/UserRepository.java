package com.teamtime.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teamtime.entity.User;

import java.util.Optional;

import javax.swing.Spring;

public interface UserRepository extends JpaRepository<User, Long> {
        Optional<User> findByEmail(String email);
        //"Email'e göre kullanıcı bul."
//Spring Data JPA metodun ismine bakarak arka planda otomatik SQL oluşturuyor.
}
package com.teamtime.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teamtime.entity.User;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
        Optional<User> findByEmail(String email);
        Optional<User> findByEmailIgnoreCase(String email);
        boolean existsByEmailIgnoreCase(String email);
        List<User> findTop10ByNameContainingIgnoreCaseOrSurnameContainingIgnoreCase(String name, String surname);
        //"Email'e göre kullanıcı bul."
//Spring Data JPA metodun ismine bakarak arka planda otomatik SQL oluşturuyor.
}

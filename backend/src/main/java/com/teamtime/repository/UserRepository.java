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
        List<User> findTop10ByUsernameContainingIgnoreCaseOrNameContainingIgnoreCaseOrSurnameContainingIgnoreCase(String username, String name, String surname);
        //"Email'e göre kullanıcı bul."
//Spring Data JPA metodun ismine bakarak arka planda otomatik SQL oluşturuyor.
}

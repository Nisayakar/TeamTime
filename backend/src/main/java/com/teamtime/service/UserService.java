package com.teamtime.service;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.teamtime.dto.RegisterRequest;
import com.teamtime.entity.User;
import com.teamtime.repository.UserRepository;
import com.teamtime.security.JwtService;
import com.teamtime.dto.LoginRequest;
import com.teamtime.dto.LoginResponse;
import com.teamtime.dto.ProfileResponse;
import com.teamtime.dto.UpdatePasswordRequest;
import com.teamtime.dto.UpdateProfileRequest;
import com.teamtime.dto.UserSearchResponse;
import com.teamtime.exception.DuplicateEmailException;
import com.teamtime.exception.InvalidCredentialsException;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, JwtService jwtService, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    public String register(RegisterRequest request) {
        String email = request.getEmail().trim();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateEmailException("Bu email adresi ile kayıtlı bir kullanıcı zaten var");
        }

        User user = new User();

        user.setName(request.getName().trim());
        user.setSurname(request.getSurname().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        userRepository.save(user);

        return "Kullanıcı Başarıyla Kaydedildi";
    }

    public LoginResponse login(LoginRequest request) {

        Optional<User> user = userRepository.findByEmailIgnoreCase(request.getEmail().trim());

        if (user.isEmpty()) {
            throw new InvalidCredentialsException("Email veya şifre hatalı");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.get().getPassword())) {
            throw new InvalidCredentialsException("Email veya şifre hatalı");
        }

        User loggedUser = user.get();
        String token = jwtService.generateToken(loggedUser);

        return new LoginResponse(
                loggedUser.getId(),
                loggedUser.getName(),
                loggedUser.getSurname(),
                loggedUser.getEmail(),
                token);
    }

    public ProfileResponse getProfile(Long userId) {
        User user = findUserById(userId);

        return toProfileResponse(user);
    }

    public ProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = findUserById(userId);
        String email = request.getEmail().trim();

        if (!user.getEmail().equalsIgnoreCase(email) && userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateEmailException("Bu email adresi ile kayıtlı bir kullanıcı zaten var");
        }

        user.setName(request.getName().trim());
        user.setSurname(request.getSurname().trim());
        user.setEmail(email);

        User updatedUser = userRepository.save(user);

        return toProfileResponse(updatedUser);
    }

    public String updatePassword(Long userId, UpdatePasswordRequest request) {
        User user = findUserById(userId);

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Eski şifre hatalı");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return "Şifre başarıyla güncellendi";
    }

    public List<UserSearchResponse> searchUsers(String query) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }

        String searchTerm = query.trim();

        return userRepository
                .findTop10ByNameContainingIgnoreCaseOrSurnameContainingIgnoreCase(searchTerm, searchTerm)
                .stream()
                .map(user -> new UserSearchResponse(
                        user.getId(),
                        user.getName(),
                        user.getSurname()))
                .toList();
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı"));
    }

    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı"));
    }

    private ProfileResponse toProfileResponse(User user) {
        return new ProfileResponse(
                user.getId(),
                user.getName(),
                user.getSurname(),
                user.getEmail());
    }
}

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
        User user = new User();

        user.setName(request.getName());
        user.setSurname(request.getSurname());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        userRepository.save(user);

        return "Kullanıcı Başarıyla Kaydedildi";
    }

    public LoginResponse login(LoginRequest request) {

        Optional<User> user = userRepository.findByEmail(request.getEmail());

        if (user.isEmpty()) {
            return null;
        }

        if (!passwordEncoder.matches(request.getPassword(), user.get().getPassword())) {
            return null;
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

        user.setName(request.getName());
        user.setSurname(request.getSurname());
        user.setEmail(request.getEmail());

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

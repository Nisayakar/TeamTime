package com.teamtime.service;

import org.springframework.stereotype.Service;

import com.teamtime.dto.RegisterRequest;
import com.teamtime.entity.User;
import com.teamtime.repository.UserRepository;
import com.teamtime.dto.LoginRequest;
import com.teamtime.dto.LoginResponse;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public String register(RegisterRequest request) {
        User user = new User();

        user.setName(request.getName());
        user.setSurname(request.getSurname());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());

        userRepository.save(user);

        return "Kullanıcı Başarıyla Kaydedildi";
    }

    public LoginResponse login(LoginRequest request) {

        Optional<User> user = userRepository.findByEmail(request.getEmail());

        if (user.isEmpty()) {
            return null;
        }

        if (!user.get().getPassword().equals(request.getPassword())) {
            return null;
        }

        User loggedUser = user.get();
        return new LoginResponse(
                loggedUser.getId(),
                loggedUser.getName(),
                loggedUser.getSurname(),
                loggedUser.getEmail());
    }
}

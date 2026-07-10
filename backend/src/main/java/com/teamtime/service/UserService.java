package com.teamtime.service;

import org.springframework.stereotype.Service;

import com.teamtime.dto.RegisterRequest;
import com.teamtime.entity.User;
import com.teamtime.repository.UserRepository;

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
}

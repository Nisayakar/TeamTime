package com.teamtime.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.teamtime.dto.LoginRequest;
import com.teamtime.dto.LoginResponse;
import com.teamtime.dto.ProfileResponse;
import com.teamtime.dto.RegisterCodeRequest;
import com.teamtime.dto.RegisterRequest;
import com.teamtime.dto.ResendRegistrationCodeRequest;
import com.teamtime.dto.UpdatePasswordRequest;
import com.teamtime.dto.UpdateProfileRequest;
import com.teamtime.dto.UserSearchResponse;
import com.teamtime.dto.VerifyRegistrationRequest;
import com.teamtime.service.UserService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;

import jakarta.validation.Valid;
import java.util.List;


@RestController
@RequestMapping("/api") //Bu sınıftaki bütün adreslerin başına /api ekler.
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService){
        this.userService=userService;
    }


    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest request) {
        
        return ResponseEntity.ok(userService.register(request));
    }

    @PostMapping("/auth/register/request-code")
    public ResponseEntity<String> requestRegistrationCode(@Valid @RequestBody RegisterCodeRequest request) {
        return ResponseEntity.ok(userService.requestRegistrationCode(request));
    }

    @PostMapping("/auth/register/verify")
    public ResponseEntity<String> verifyRegistration(@Valid @RequestBody VerifyRegistrationRequest request) {
        return ResponseEntity.ok(userService.verifyRegistration(request));
    }

    @PostMapping("/auth/register/resend-code")
    public ResponseEntity<String> resendRegistrationCode(@Valid @RequestBody ResendRegistrationCodeRequest request) {
        return ResponseEntity.ok(userService.resendRegistrationCode(request));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }

    @GetMapping("/profile")
    public ResponseEntity<ProfileResponse> getProfile(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();

        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @GetMapping("/users/search")
    public ResponseEntity<List<UserSearchResponse>> searchUsers(@RequestParam String query) {
        return ResponseEntity.ok(userService.searchUsers(query));
    }

    @PutMapping("/profile")
    public ResponseEntity<ProfileResponse> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        Long userId = (Long) authentication.getPrincipal();

        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    @PutMapping("/profile/password")
    public ResponseEntity<String> updatePassword(
            Authentication authentication,
            @Valid @RequestBody UpdatePasswordRequest request
    ) {
        Long userId = (Long) authentication.getPrincipal();

        return ResponseEntity.ok(userService.updatePassword(userId, request));
    }
    
    
}

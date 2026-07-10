package com.teamtime.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.teamtime.dto.RegisterRequest;
import com.teamtime.service.UserService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@RestController
@RequestMapping("/api") //Bu sınıftaki bütün adreslerin başına /api ekler.
public class UserController {
    private final UserService userService;

    public UserController(UserService userService){
        this.userService=userService;
    }


    @PostMapping("/register")
    public String register(@RequestBody RegisterRequest request) {
        
        return userService.register(request);
    }
    
}

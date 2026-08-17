package com.teamtime.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class UpdateProfileRequest {

    @NotBlank(message = "Ad boş bırakılamaz")
    private String name;

    @NotBlank(message = "Soyad boş bırakılamaz")
    private String surname;

    @NotBlank(message = "Kullanıcı Adı boş bırakılamaz")
    private String username;

    @Email(message = "Email formatı doğru olmalı")
    private String email;

    public UpdateProfileRequest() {
    }

    public UpdateProfileRequest(String name, String surname, String username, String email) {
        this.name = name;
        this.surname = surname;
        this.username = username;
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSurname() {
        return surname;
    }

    public void setSurname(String surname) {
        this.surname = surname;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}

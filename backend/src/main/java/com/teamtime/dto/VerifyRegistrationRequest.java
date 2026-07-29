package com.teamtime.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class VerifyRegistrationRequest {

    @NotBlank(message = "Email boş bırakılamaz")
    @Email(message = "Email formatı doğru olmalı")
    private String email;

    @NotBlank(message = "Kod boş bırakılamaz")
    @Pattern(regexp = "\\d{6}", message = "Kod 6 haneli olmalı")
    private String code;

    public VerifyRegistrationRequest() {
    }

    public VerifyRegistrationRequest(String email, String code) {
        this.email = email;
        this.code = code;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}

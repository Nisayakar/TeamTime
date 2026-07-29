package com.teamtime.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class ResendRegistrationCodeRequest {

    @NotBlank(message = "Email boş bırakılamaz")
    @Email(message = "Email formatı doğru olmalı")
    private String email;

    public ResendRegistrationCodeRequest() {
    }

    public ResendRegistrationCodeRequest(String email) {
        this.email = email;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}

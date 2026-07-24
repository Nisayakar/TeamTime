package com.teamtime.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AddTeamMemberRequest {

    @NotNull(message = "Kullanıcı seçilmelidir")
    private Long userId;

    @NotBlank(message = "Rol seçilmelidir")
    private String role;

    public AddTeamMemberRequest() {
    }

    public AddTeamMemberRequest(Long userId, String role) {
        this.userId = userId;
        this.role = role;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}

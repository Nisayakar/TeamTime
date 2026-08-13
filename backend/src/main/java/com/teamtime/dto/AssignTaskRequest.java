package com.teamtime.dto;

import jakarta.validation.constraints.NotNull;

public class AssignTaskRequest {

    @NotNull(message = "Atanacak kullanıcı zorunludur")
    private Long userId;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }
}

package com.teamtime.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RejectTaskAssignmentRequest {

    @NotBlank(message = "Mazeret zorunludur")
    @Size(max = 500, message = "Mazeret en fazla 500 karakter olabilir")
    private String reason;

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}

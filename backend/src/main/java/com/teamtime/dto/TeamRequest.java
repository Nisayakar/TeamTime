package com.teamtime.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class TeamRequest {

    @NotBlank(message = "Takım adı boş bırakılamaz")
    @Size(max = 120, message = "Takım adı en fazla 120 karakter olabilir")
    private String name;

    @Size(max = 1000, message = "Takım açıklaması en fazla 1000 karakter olabilir")
    private String description;

    public TeamRequest() {
    }

    public TeamRequest(String name, String description) {
        setName(name);
        setDescription(description);
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = trim(name);
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = trimToNull(description);
    }

    private String trim(String value) {
        if (value == null) {
            return null;
        }

        return value.trim();
    }

    private String trimToNull(String value) {
        String trimmed = trim(value);

        if (trimmed == null || trimmed.isEmpty()) {
            return null;
        }

        return trimmed;
    }
}

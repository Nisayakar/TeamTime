package com.teamtime.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ProjectRequest {

    @NotBlank(message = "Proje adı boş bırakılamaz")
    @Size(max = 120, message = "Proje adı en fazla 120 karakter olabilir")
    private String projectName;

    @Size(max = 1000, message = "Proje açıklaması en fazla 1000 karakter olabilir")
    private String description;

    private Long teamId;
    private LocalDate startDate;
    private LocalDate endDate;

    public ProjectRequest() {
    }

    public ProjectRequest(String projectName, String description, Long teamId, LocalDate startDate, LocalDate endDate) {
        setProjectName(projectName);
        setDescription(description);
        this.teamId = teamId;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = trim(projectName);
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = trimToNull(description);
    }

    public Long getTeamId() {
        return teamId;
    }

    public void setTeamId(Long teamId) {
        this.teamId = teamId;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    @AssertTrue(message = "Bitiş tarihi başlangıç tarihinden önce olamaz")
    public boolean isEndDateOnOrAfterStartDate() {
        return startDate == null || endDate == null || !endDate.isBefore(startDate);
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

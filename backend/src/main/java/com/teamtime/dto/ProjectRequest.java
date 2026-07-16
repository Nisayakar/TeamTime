package com.teamtime.dto;

import java.time.LocalDate;

public class ProjectRequest {

    private String projectName;
    private String description;
    private String teamName;
    private LocalDate startDate;
    private LocalDate endDate;

    public ProjectRequest() {
    }

    public ProjectRequest(String projectName, String description, String teamName, LocalDate startDate, LocalDate endDate) {
        this.projectName = projectName;
        this.description = description;
        this.teamName = teamName;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getTeamName() {
        return teamName;
    }

    public void setTeamName(String teamName) {
        this.teamName = teamName;
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
}
package com.teamtime.dto;

import java.time.LocalDateTime;

public class TeamMemberResponse {

    private Long id;

    private Long userId;

    private String userName;

    private Long teamId;

    private String teamName;

    private String role;

    private LocalDateTime joinedDate;

    public TeamMemberResponse() {
    }

    public TeamMemberResponse(Long id, Long userId, String userName, Long teamId, String teamName, String role,
            LocalDateTime joinedDate) {
        this.id = id;
        this.userId = userId;
        this.userName = userName;
        this.teamId = teamId;
        this.teamName = teamName;
        this.role = role;
        this.joinedDate = joinedDate;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public Long getTeamId() {
        return teamId;
    }

    public void setTeamId(Long teamId) {
        this.teamId = teamId;
    }

    public String getTeamName() {
        return teamName;
    }

    public void setTeamName(String teamName) {
        this.teamName = teamName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public LocalDateTime getJoinedDate() {
        return joinedDate;
    }

    public void setJoinedDate(LocalDateTime joinedDate) {
        this.joinedDate = joinedDate;
    }
}

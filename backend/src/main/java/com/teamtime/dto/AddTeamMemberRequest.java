package com.teamtime.dto;

public class AddTeamMemberRequest {

    private Long userId;

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

package com.teamtime.dto;

import com.teamtime.entity.TeamInvitationStatus;
import java.time.LocalDateTime;

public class TeamInvitationResponse {

    private Long invitationId;
    private Long teamId;
    private String teamName;
    private String inviterName;
    private TeamInvitationStatus status;
    private LocalDateTime createdAt;

    private String invitedUserFullName;
    private String invitedUsername;

    public TeamInvitationResponse() {
    }

    public TeamInvitationResponse(Long invitationId, Long teamId, String teamName, String inviterName, String invitedUserFullName, String invitedUsername, TeamInvitationStatus status, LocalDateTime createdAt) {
        this.invitationId = invitationId;
        this.teamId = teamId;
        this.teamName = teamName;
        this.inviterName = inviterName;
        this.invitedUserFullName = invitedUserFullName;
        this.invitedUsername = invitedUsername;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Long getInvitationId() {
        return invitationId;
    }

    public void setInvitationId(Long invitationId) {
        this.invitationId = invitationId;
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

    public String getInviterName() {
        return inviterName;
    }

    public void setInviterName(String inviterName) {
        this.inviterName = inviterName;
    }

    public TeamInvitationStatus getStatus() {
        return status;
    }

    public void setStatus(TeamInvitationStatus status) {
        this.status = status;
    }

    public String getInvitedUserFullName() {
        return invitedUserFullName;
    }

    public void setInvitedUserFullName(String invitedUserFullName) {
        this.invitedUserFullName = invitedUserFullName;
    }

    public String getInvitedUsername() {
        return invitedUsername;
    }

    public void setInvitedUsername(String invitedUsername) {
        this.invitedUsername = invitedUsername;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

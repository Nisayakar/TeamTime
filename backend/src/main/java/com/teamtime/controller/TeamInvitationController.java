package com.teamtime.controller;

import com.teamtime.dto.TeamInvitationResponse;
import com.teamtime.service.TeamInvitationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/team-invitations")
@CrossOrigin(origins = "http://localhost:5173")
public class TeamInvitationController {

    private final TeamInvitationService teamInvitationService;

    public TeamInvitationController(TeamInvitationService teamInvitationService) {
        this.teamInvitationService = teamInvitationService;
    }

    @GetMapping
    public ResponseEntity<List<TeamInvitationResponse>> getMyInvitations(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(teamInvitationService.getPendingInvitations(userId));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<Void> acceptInvitation(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        teamInvitationService.acceptInvitation(id, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Void> rejectInvitation(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        teamInvitationService.rejectInvitation(id, userId);
        return ResponseEntity.ok().build();
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    public ResponseEntity<Void> revokeInvitation(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        teamInvitationService.revokeInvitation(id, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/team/{teamId}")
    public ResponseEntity<List<TeamInvitationResponse>> getTeamInvitations(@PathVariable Long teamId, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(teamInvitationService.getTeamPendingInvitations(teamId, userId));
    }

    @PostMapping("/team/{teamId}")
    public ResponseEntity<Void> inviteUserToTeam(@PathVariable Long teamId, @org.springframework.web.bind.annotation.RequestBody java.util.Map<String, Long> payload, Authentication authentication) {
        Long currentUserId = (Long) authentication.getPrincipal();
        Long invitedUserId = payload.get("invitedUserId");
        if (invitedUserId == null) {
            return ResponseEntity.badRequest().build();
        }
        
        // Load the team and user, then create invitation.
        // wait, I need to call the service.
        teamInvitationService.inviteUser(teamId, currentUserId, invitedUserId);
        return ResponseEntity.ok().build();
    }
}


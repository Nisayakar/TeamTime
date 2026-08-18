package com.teamtime.controller;

import com.teamtime.dto.AddTeamMemberRequest;
import com.teamtime.dto.TeamMemberResponse;
import com.teamtime.service.TeamMemberService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class TeamMemberController {

    private final TeamMemberService teamMemberService;

    public TeamMemberController(TeamMemberService teamMemberService) {
        this.teamMemberService = teamMemberService;
    }

    @PostMapping("/teams/{teamId}/members")
    public ResponseEntity<TeamMemberResponse> addMember(@PathVariable Long teamId,
            @Valid @RequestBody AddTeamMemberRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        TeamMemberResponse teamMember = teamMemberService.addMember(teamId, request, userId);
        return ResponseEntity.ok(teamMember);
    }

    @DeleteMapping("/teams/{teamId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long teamId,
            @PathVariable Long userId,
            Authentication authentication
    ) {
        Long currentUserId = (Long) authentication.getPrincipal();
        teamMemberService.removeMember(teamId, userId, currentUserId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/teams/{teamId}/members/me")
    public ResponseEntity<Void> leaveTeam(@PathVariable Long teamId, Authentication authentication) {
        Long currentUserId = (Long) authentication.getPrincipal();
        teamMemberService.leaveTeam(teamId, currentUserId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/teams/{teamId}/members/{userId}/owner")
    public ResponseEntity<List<TeamMemberResponse>> transferOwnership(
            @PathVariable Long teamId,
            @PathVariable Long userId,
            Authentication authentication
    ) {
        Long currentUserId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(teamMemberService.transferOwnership(teamId, userId, currentUserId));
    }

    @PutMapping("/teams/{teamId}/members/{userId}/admin")
    public ResponseEntity<TeamMemberResponse> promoteToAdmin(
            @PathVariable Long teamId,
            @PathVariable Long userId,
            Authentication authentication
    ) {
        Long currentUserId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(teamMemberService.promoteToAdmin(teamId, userId, currentUserId));
    }

    @PutMapping("/teams/{teamId}/members/{userId}/member")
    public ResponseEntity<TeamMemberResponse> demoteToMember(
            @PathVariable Long teamId,
            @PathVariable Long userId,
            Authentication authentication
    ) {
        Long currentUserId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(teamMemberService.demoteToMember(teamId, userId, currentUserId));
    }

    @GetMapping("/teams/{teamId}/members")
    public ResponseEntity<List<TeamMemberResponse>> getTeamMembers(@PathVariable Long teamId, Authentication authentication) {
        Long currentUserId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(teamMemberService.getTeamMembers(teamId, currentUserId));
    }

    @GetMapping("/users/{userId}/teams")
    public ResponseEntity<List<TeamMemberResponse>> getUserTeams(@PathVariable Long userId, Authentication authentication) {
        Long currentUserId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(teamMemberService.getUserTeams(userId, currentUserId));
    }
}

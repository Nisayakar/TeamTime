package com.teamtime.controller;

import com.teamtime.dto.AddTeamMemberRequest;
import com.teamtime.dto.TeamMemberResponse;
import com.teamtime.service.TeamMemberService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
            @RequestBody AddTeamMemberRequest request) {
        TeamMemberResponse teamMember = teamMemberService.addMember(teamId, request);
        return ResponseEntity.ok(teamMember);
    }

    @DeleteMapping("/teams/{teamId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long teamId, @PathVariable Long userId) {
        teamMemberService.removeMember(teamId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/teams/{teamId}/members")
    public ResponseEntity<List<TeamMemberResponse>> getTeamMembers(@PathVariable Long teamId) {
        return ResponseEntity.ok(teamMemberService.getTeamMembers(teamId));
    }

    @GetMapping("/users/{userId}/teams")
    public ResponseEntity<List<TeamMemberResponse>> getUserTeams(@PathVariable Long userId) {
        return ResponseEntity.ok(teamMemberService.getUserTeams(userId));
    }
}

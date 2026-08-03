package com.teamtime.controller;

import com.teamtime.dto.TeamRequest;
import com.teamtime.dto.TeamResponse;
import com.teamtime.service.TeamService;
import jakarta.validation.Valid;
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

@RestController
@RequestMapping("/api/teams")
@CrossOrigin(origins = "http://localhost:5173")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @PostMapping
    public ResponseEntity<TeamResponse> createTeam(@Valid @RequestBody TeamRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        TeamResponse createdTeam = teamService.createTeam(request, userId);
        return ResponseEntity.ok(createdTeam);
    }

    @GetMapping
    public ResponseEntity<List<TeamResponse>> getAllTeams(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(teamService.getTeamsForUser(userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TeamResponse> updateTeam(
            @PathVariable Long id,
            @Valid @RequestBody TeamRequest request,
            Authentication authentication
    ) {
        Long userId = (Long) authentication.getPrincipal();
        TeamResponse updatedTeam = teamService.updateTeam(id, request, userId);
        return ResponseEntity.ok(updatedTeam);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeam(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        teamService.deleteTeam(id, userId);
        return ResponseEntity.noContent().build();
    }
}

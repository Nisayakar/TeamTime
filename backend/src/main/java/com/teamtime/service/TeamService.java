package com.teamtime.service;

import com.teamtime.entity.Team;
import com.teamtime.repository.TeamRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TeamService {

    private final TeamRepository teamRepository;

    public TeamService(TeamRepository teamRepository) {
        this.teamRepository = teamRepository;
    }

    public Team createTeam(Team team) {
        return teamRepository.save(team);
    }

    public List<Team> getAllTeams() {
        return teamRepository.findAll();
    }

    public Team updateTeam(Long id, Team team) {
        Team existingTeam = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found"));

        existingTeam.setName(team.getName());
        existingTeam.setDescription(team.getDescription());
        existingTeam.setCreatedDate(team.getCreatedDate());

        return teamRepository.save(existingTeam);
    }

    public void deleteTeam(Long id) {
        Team existingTeam = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found"));

        teamRepository.delete(existingTeam);
    }
}

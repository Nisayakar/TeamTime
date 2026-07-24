package com.teamtime.service;

import com.teamtime.dto.AddTeamMemberRequest;
import com.teamtime.dto.TeamMemberResponse;
import com.teamtime.entity.Team;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.User;
import com.teamtime.repository.TeamMemberRepository;
import com.teamtime.repository.TeamRepository;
import com.teamtime.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TeamMemberService {

    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    public TeamMemberService(TeamMemberRepository teamMemberRepository, TeamRepository teamRepository,
            UserRepository userRepository) {
        this.teamMemberRepository = teamMemberRepository;
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
    }

    public TeamMemberResponse addMember(Long teamId, AddTeamMemberRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Takım bulunamadı."));

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı."));

        if (teamMemberRepository.findByTeamIdAndUserId(teamId, request.getUserId()).isPresent()) {
            throw new IllegalArgumentException("Bu kullanıcı zaten takımda.");
        }

        TeamMember teamMember = new TeamMember();
        teamMember.setTeam(team);
        teamMember.setUser(user);
        teamMember.setRole(request.getRole());
        teamMember.setJoinedDate(LocalDateTime.now());

        TeamMember savedTeamMember = teamMemberRepository.save(teamMember);

        return convertToResponse(savedTeamMember);
    }

    public void removeMember(Long teamId, Long userId) {
        TeamMember teamMember = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new RuntimeException("Team member not found"));

        teamMemberRepository.delete(teamMember);
    }

    public List<TeamMemberResponse> getTeamMembers(Long teamId) {
        return teamMemberRepository.findByTeamId(teamId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    public List<TeamMemberResponse> getUserTeams(Long userId) {
        return teamMemberRepository.findByUserId(userId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    private TeamMemberResponse convertToResponse(TeamMember teamMember) {
        User user = teamMember.getUser();
        Team team = teamMember.getTeam();

        return new TeamMemberResponse(
                teamMember.getId(),
                user.getId(),
                user.getName(),
                team.getId(),
                team.getName(),
                teamMember.getRole(),
                teamMember.getJoinedDate());
    }
}

package com.teamtime.service;

import com.teamtime.entity.Team;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.TeamRole;
import com.teamtime.entity.User;
import com.teamtime.exception.ResourceNotFoundException;
import com.teamtime.repository.TeamMemberRepository;
import com.teamtime.repository.TeamRepository;
import com.teamtime.repository.UserRepository;
import jakarta.transaction.Transactional;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    public TeamService(
            TeamRepository teamRepository,
            TeamMemberRepository teamMemberRepository,
            UserRepository userRepository
    ) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Team createTeam(Team team, Long creatorUserId) {
        User creator = userRepository.findById(creatorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        if (team.getCreatedDate() == null) {
            team.setCreatedDate(java.time.LocalDateTime.now());
        }

        Team savedTeam = teamRepository.save(team);

        TeamMember ownerMembership = new TeamMember();
        ownerMembership.setTeam(savedTeam);
        ownerMembership.setUser(creator);
        ownerMembership.setRole(TeamRole.OWNER.name());
        ownerMembership.setJoinedDate(java.time.LocalDateTime.now());
        teamMemberRepository.save(ownerMembership);

        return savedTeam;
    }

    public List<Team> getTeamsForUser(Long userId) {
        return teamRepository.findDistinctByMemberUserId(userId);
    }

    public Team updateTeam(Long id, Team team, Long currentUserId) {
        Team existingTeam = teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));
        TeamMember currentMembership = requireMembership(id, currentUserId);
        TeamRole currentRole = TeamRole.from(currentMembership.getRole());

        if (currentRole != TeamRole.OWNER && currentRole != TeamRole.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("Takımı güncelleme yetkiniz yok");
        }

        existingTeam.setName(team.getName());
        existingTeam.setDescription(team.getDescription());
        existingTeam.setCreatedDate(team.getCreatedDate());

        return teamRepository.save(existingTeam);
    }

    @Transactional
    public void deleteTeam(Long id, Long currentUserId) {
        Team existingTeam = teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));
        TeamMember currentMembership = requireMembership(id, currentUserId);

        if (TeamRole.from(currentMembership.getRole()) != TeamRole.OWNER) {
            throw new org.springframework.security.access.AccessDeniedException("Takımı silme yetkiniz yok");
        }

        teamMemberRepository.deleteByTeamId(id);
        teamRepository.delete(existingTeam);
    }

    private TeamMember requireMembership(Long teamId, Long userId) {
        return teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Bu takım için yetkiniz yok"));
    }
}

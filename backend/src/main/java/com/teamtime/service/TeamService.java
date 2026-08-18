package com.teamtime.service;

import com.teamtime.dto.TeamRequest;
import com.teamtime.dto.TeamResponse;
import com.teamtime.entity.Team;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.TeamRole;
import com.teamtime.entity.User;
import com.teamtime.exception.ConflictException;
import com.teamtime.exception.ResourceNotFoundException;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TeamInvitationRepository;
import com.teamtime.repository.TeamMemberRepository;
import com.teamtime.repository.TeamRepository;
import com.teamtime.repository.UserRepository;
import jakarta.transaction.Transactional;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TeamInvitationRepository teamInvitationRepository;
    private final TeamInvitationService teamInvitationService;

    public TeamService(
            TeamRepository teamRepository,
            TeamMemberRepository teamMemberRepository,
            UserRepository userRepository,
            ProjectRepository projectRepository,
            TeamInvitationRepository teamInvitationRepository,
            TeamInvitationService teamInvitationService
    ) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.teamInvitationRepository = teamInvitationRepository;
        this.teamInvitationService = teamInvitationService;
    }

    @Transactional
    public TeamResponse createTeam(TeamRequest request, Long creatorUserId) {
        User creator = userRepository.findById(creatorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        Team team = new Team();
        team.setName(request.getName());
        team.setDescription(request.getDescription());

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

        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            teamInvitationService.createInvitations(savedTeam, creator, request.getMemberIds());
        }

        return toResponse(savedTeam);
    }

    public List<TeamResponse> getTeamsForUser(Long userId) {
        return teamRepository.findDistinctByMemberUserId(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public TeamResponse updateTeam(Long id, TeamRequest request, Long currentUserId) {
        Team existingTeam = teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));
        TeamMember currentMembership = requireMembership(id, currentUserId);
        TeamRole currentRole = TeamRole.from(currentMembership.getRole());

        if (currentRole != TeamRole.OWNER && currentRole != TeamRole.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("Takımı güncelleme yetkiniz yok");
        }

        existingTeam.setName(request.getName());
        existingTeam.setDescription(request.getDescription());

        return toResponse(teamRepository.save(existingTeam));
    }

    @Transactional
    public void deleteTeam(Long id, Long currentUserId) {
        Team existingTeam = teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));
        TeamMember currentMembership = requireMembership(id, currentUserId);

        if (TeamRole.from(currentMembership.getRole()) != TeamRole.OWNER) {
            throw new org.springframework.security.access.AccessDeniedException("Takımı silme yetkiniz yok");
        }

        if (projectRepository.existsByTeam_Id(id)) {
            throw new ConflictException("Bu takıma bağlı projeler bulunmaktadır. Önce projeleri silmeniz veya başka bir takıma taşımanız gerekir.");
        }

        teamInvitationRepository.deleteByTeamId(id);
        teamMemberRepository.deleteByTeamId(id);
        teamRepository.delete(existingTeam);
    }

    private TeamMember requireMembership(Long teamId, Long userId) {
        return teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Bu takım için yetkiniz yok"));
    }

    public TeamResponse toResponse(Team team) {
        return new TeamResponse(
                team.getId(),
                team.getName(),
                team.getDescription(),
                team.getCreatedDate());
    }
}

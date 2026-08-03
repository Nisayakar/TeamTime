package com.teamtime.service;

import com.teamtime.dto.AddTeamMemberRequest;
import com.teamtime.dto.TeamMemberResponse;
import com.teamtime.entity.Team;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.TeamRole;
import com.teamtime.entity.User;
import com.teamtime.exception.ConflictException;
import com.teamtime.exception.ResourceNotFoundException;
import com.teamtime.repository.TeamMemberRepository;
import com.teamtime.repository.TeamRepository;
import com.teamtime.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TeamMemberService {

    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public TeamMemberService(TeamMemberRepository teamMemberRepository, TeamRepository teamRepository,
            UserRepository userRepository, NotificationService notificationService) {
        this.teamMemberRepository = teamMemberRepository;
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public TeamMemberResponse addMember(Long teamId, AddTeamMemberRequest request, Long currentUserId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Takım bulunamadı."));
        TeamMember currentMembership = requireMembership(teamId, currentUserId);
        TeamRole currentRole = TeamRole.from(currentMembership.getRole());

        if (currentRole != TeamRole.OWNER && currentRole != TeamRole.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("Takıma üye ekleme yetkiniz yok");
        }

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı."));

        if (teamMemberRepository.findByTeamIdAndUserId(teamId, request.getUserId()).isPresent()) {
            throw new ConflictException("Bu kullanıcı zaten takımda.");
        }

        TeamRole requestedRole = normalizeRequestedRole(request.getRole());

        if (requestedRole == TeamRole.OWNER) {
            throw new ConflictException("OWNER rolü üye ekleme isteği ile atanamaz.");
        }

        if (requestedRole == TeamRole.ADMIN && currentRole != TeamRole.OWNER) {
            throw new org.springframework.security.access.AccessDeniedException("ADMIN rolü yalnızca takım sahibi tarafından atanabilir");
        }

        TeamMember teamMember = new TeamMember();
        teamMember.setTeam(team);
        teamMember.setUser(user);
        teamMember.setRole(requestedRole.name());
        teamMember.setJoinedDate(LocalDateTime.now());

        TeamMember savedTeamMember = teamMemberRepository.save(teamMember);
        notificationService.notifyTeamMemberAdded(user, team, requestedRole.name());

        return convertToResponse(savedTeamMember);
    }

    @Transactional
    public void removeMember(Long teamId, Long userId, Long currentUserId) {
        TeamMember currentMembership = requireMembership(teamId, currentUserId);
        TeamRole currentRole = TeamRole.from(currentMembership.getRole());

        if (currentRole != TeamRole.OWNER && currentRole != TeamRole.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("Takımdan üye çıkarma yetkiniz yok");
        }

        TeamMember teamMember = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Team member not found"));
        TeamRole targetRole = TeamRole.from(teamMember.getRole());

        if (targetRole == TeamRole.OWNER) {
            throw new ConflictException("Takım sahibi bu endpoint üzerinden çıkarılamaz.");
        }

        if (currentRole == TeamRole.ADMIN && targetRole == TeamRole.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("ADMIN başka bir ADMIN üyeyi çıkaramaz");
        }

        notificationService.notifyTeamMemberRemoved(teamMember.getUser(), teamMember.getTeam());
        teamMemberRepository.delete(teamMember);
    }

    public List<TeamMemberResponse> getTeamMembers(Long teamId, Long currentUserId) {
        requireMembership(teamId, currentUserId);

        return teamMemberRepository.findByTeamId(teamId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    public List<TeamMemberResponse> getUserTeams(Long userId, Long currentUserId) {
        if (!userId.equals(currentUserId)) {
            throw new org.springframework.security.access.AccessDeniedException("Başka bir kullanıcının takımları görüntülenemez");
        }

        return teamMemberRepository.findByUserId(userId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    private TeamMember requireMembership(Long teamId, Long userId) {
        return teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Bu takım için yetkiniz yok"));
    }

    private TeamRole normalizeRequestedRole(String role) {
        try {
            return TeamRole.from(role);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Geçersiz takım rolü");
        }
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

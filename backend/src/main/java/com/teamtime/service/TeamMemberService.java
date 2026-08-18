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
    private final TaskService taskService;

    public TeamMemberService(TeamMemberRepository teamMemberRepository, TeamRepository teamRepository,
            UserRepository userRepository, NotificationService notificationService, TaskService taskService) {
        this.teamMemberRepository = teamMemberRepository;
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.taskService = taskService;
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
            throw new ConflictException("Sahip rolü üye ekleme isteği ile atanamaz.");
        }

        if (requestedRole == TeamRole.ADMIN && currentRole != TeamRole.OWNER) {
            throw new org.springframework.security.access.AccessDeniedException("Yönetici rolü yalnızca takım sahibi tarafından atanabilir");
        }

        TeamMember teamMember = new TeamMember();
        teamMember.setTeam(team);
        teamMember.setUser(user);
        teamMember.setRole(requestedRole.name());
        teamMember.setJoinedDate(LocalDateTime.now());

        TeamMember savedTeamMember = teamMemberRepository.save(teamMember);
        notificationService.notifyTeamMemberAdded(user, team, requestedRole.name());

        return convertToResponse(savedTeamMember, false);
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
            throw new org.springframework.security.access.AccessDeniedException("Yönetici başka bir yöneticiyi çıkaramaz");
        }

        taskService.cleanupTasksForRemovedMember(teamId, userId);
        notificationService.notifyTeamMemberRemoved(teamMember.getUser(), teamMember.getTeam());
        teamMemberRepository.delete(teamMember);
    }

    @Transactional
    public void leaveTeam(Long teamId, Long currentUserId) {
        TeamMember currentMembership = requireMembership(teamId, currentUserId);

        if (TeamRole.from(currentMembership.getRole()) == TeamRole.OWNER) {
            throw new ConflictException("Takımdan çıkmadan önce takım sahipliğini başka bir üyeye devretmelisiniz.");
        }

        taskService.cleanupTasksForRemovedMember(teamId, currentUserId);
        teamMemberRepository.delete(currentMembership);
    }

    @Transactional
    public List<TeamMemberResponse> transferOwnership(Long teamId, Long targetUserId, Long currentUserId) {
        List<TeamMember> teamMembers = teamMemberRepository.findByTeamIdForWrite(teamId);

        TeamMember currentMembership = teamMembers.stream()
                .filter(m -> m.getUser().getId().equals(currentUserId))
                .findFirst()
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Bu takım için yetkiniz yok"));

        if (TeamRole.from(currentMembership.getRole()) != TeamRole.OWNER) {
            throw new org.springframework.security.access.AccessDeniedException("Takım sahipliğini devretme yetkiniz yok");
        }

        if (currentUserId.equals(targetUserId)) {
            throw new ConflictException("Takım sahipliği mevcut sahibine devredilemez.");
        }

        TeamMember targetMembership = teamMembers.stream()
                .filter(m -> m.getUser().getId().equals(targetUserId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Hedef kullanıcı takım üyesi değil"));

        if (TeamRole.from(targetMembership.getRole()) != TeamRole.ADMIN) {
            throw new ConflictException("Takım sahipliği yalnızca bir yöneticiye (ADMIN) devredilebilir.");
        }

        teamMembers.forEach(member -> {
            if (member.getId().equals(targetMembership.getId())) {
                member.setRole(TeamRole.OWNER.name());
            } else if (TeamRole.from(member.getRole()) == TeamRole.OWNER) {
                member.setRole(TeamRole.ADMIN.name());
            }
        });

        return teamMemberRepository.saveAll(teamMembers)
                .stream()
                .map(teamMember -> convertToResponse(teamMember, true))
                .toList();
    }

    public List<TeamMemberResponse> getTeamMembers(Long teamId, Long currentUserId) {
        requireMembership(teamId, currentUserId);

        return teamMemberRepository.findByTeamId(teamId)
                .stream()
                .map(teamMember -> convertToResponse(teamMember, true))
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
        return convertToResponse(teamMember, false);
    }

    private TeamMemberResponse convertToResponse(TeamMember teamMember, boolean includeEmail) {
        User user = teamMember.getUser();
        Team team = teamMember.getTeam();

        return new TeamMemberResponse(
                teamMember.getId(),
                user.getId(),
                "%s %s".formatted(user.getName(), user.getSurname()).trim(),
                user.getUsername(),
                includeEmail ? user.getEmail() : null,
                team.getId(),
                team.getName(),
                teamMember.getRole(),
                teamMember.getJoinedDate());
    }

    @Transactional
    public TeamMemberResponse promoteToAdmin(Long teamId, Long targetUserId, Long currentUserId) {
        TeamMember currentMembership = requireMembership(teamId, currentUserId);

        if (TeamRole.from(currentMembership.getRole()) != TeamRole.OWNER) {
            throw new org.springframework.security.access.AccessDeniedException("Bu işlem için yetkiniz yok");
        }

        TeamMember targetMembership = teamMemberRepository.findByTeamIdAndUserId(teamId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Hedef kullanıcı takım üyesi değil"));

        TeamRole targetRole = TeamRole.from(targetMembership.getRole());
        
        if (targetRole == TeamRole.OWNER || targetRole == TeamRole.ADMIN) {
            throw new ConflictException("Kullanıcı zaten " + (targetRole == TeamRole.OWNER ? "takım sahibi" : "yönetici") + ".");
        }

        targetMembership.setRole(TeamRole.ADMIN.name());
        return convertToResponse(teamMemberRepository.save(targetMembership), true);
    }

    @Transactional
    public TeamMemberResponse demoteToMember(Long teamId, Long targetUserId, Long currentUserId) {
        TeamMember currentMembership = requireMembership(teamId, currentUserId);

        if (TeamRole.from(currentMembership.getRole()) != TeamRole.OWNER) {
            throw new org.springframework.security.access.AccessDeniedException("Bu işlem için yetkiniz yok");
        }

        TeamMember targetMembership = teamMemberRepository.findByTeamIdAndUserId(teamId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Hedef kullanıcı takım üyesi değil"));

        TeamRole targetRole = TeamRole.from(targetMembership.getRole());

        if (targetRole == TeamRole.OWNER) {
            throw new ConflictException("Takım sahibinin rolü bu endpoint üzerinden değiştirilemez.");
        }

        if (targetRole == TeamRole.MEMBER) {
            throw new ConflictException("Kullanıcı zaten üye.");
        }

        targetMembership.setRole(TeamRole.MEMBER.name());
        return convertToResponse(teamMemberRepository.save(targetMembership), true);
    }
}

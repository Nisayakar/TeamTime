package com.teamtime.service;

import com.teamtime.entity.NotificationType;
import com.teamtime.entity.Team;
import com.teamtime.entity.TeamInvitation;
import com.teamtime.dto.TeamInvitationResponse;
import com.teamtime.entity.TeamInvitationStatus;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.TeamRole;
import com.teamtime.entity.User;
import com.teamtime.exception.ConflictException;
import com.teamtime.exception.ResourceNotFoundException;
import com.teamtime.repository.TeamInvitationRepository;
import com.teamtime.repository.TeamMemberRepository;
import com.teamtime.repository.TeamRepository;
import com.teamtime.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TeamInvitationService {

    private final TeamInvitationRepository teamInvitationRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final TeamRepository teamRepository;

    public TeamInvitationService(
            TeamInvitationRepository teamInvitationRepository,
            TeamMemberRepository teamMemberRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            TeamRepository teamRepository) {
        this.teamInvitationRepository = teamInvitationRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.teamRepository = teamRepository;
    }

    @Transactional
    public void createInvitations(Team team, User inviter, List<Long> memberIds) {
        if (memberIds == null || memberIds.isEmpty()) {
            return;
        }

        Set<Long> uniqueMemberIds = memberIds.stream()
                .filter(id -> !id.equals(inviter.getId()))
                .collect(Collectors.toSet());

        for (Long invitedUserId : uniqueMemberIds) {
            User invitedUser = userRepository.findById(invitedUserId).orElse(null);
            if (invitedUser == null) {
                continue;
            }

            boolean isAlreadyMember = teamMemberRepository.findByTeamIdAndUserId(team.getId(), invitedUserId).isPresent();
            if (isAlreadyMember) {
                continue;
            }

            boolean hasPendingInvitation = teamInvitationRepository.existsByTeamIdAndInvitedUserIdAndStatus(
                    team.getId(), invitedUserId, TeamInvitationStatus.PENDING);
            if (hasPendingInvitation) {
                continue;
            }

            TeamInvitation invitation = new TeamInvitation();
            invitation.setTeam(team);
            invitation.setInvitedBy(inviter);
            invitation.setInvitedUser(invitedUser);
            teamInvitationRepository.save(invitation);

            String message = String.format("%s %s, sizi %s takımına davet etti.", 
                inviter.getName(), inviter.getSurname(), team.getName());
                
            notificationService.createNotification(
                    invitedUser,
                    "Takım daveti",
                    message,
                    NotificationType.TEAM_INVITATION,
                    team.getId(),
                    "TEAM"
            );
        }
    }

    @Transactional
    public void inviteUser(Long teamId, Long currentUserId, Long invitedUserId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Takım bulunamadı."));
        User inviter = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı."));
        
        TeamMember currentMembership = teamMemberRepository.findByTeamIdAndUserId(teamId, currentUserId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Bu takıma davet gönderme yetkiniz yok."));
                
        TeamRole currentRole = TeamRole.from(currentMembership.getRole());
        if (currentRole != TeamRole.OWNER && currentRole != TeamRole.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("Bu takıma davet gönderme yetkiniz yok.");
        }

        createInvitations(team, inviter, List.of(invitedUserId));
    }

    @Transactional
    public void acceptInvitation(Long invitationId, Long currentUserId) {
        TeamInvitation invitation = teamInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Bu davet artık geçerli değil."));

        if (!invitation.getInvitedUser().getId().equals(currentUserId)) {
            throw new org.springframework.security.access.AccessDeniedException("Bu daveti kabul etme yetkiniz yok.");
        }

        if (invitation.getStatus() != TeamInvitationStatus.PENDING) {
            throw new ConflictException("Bu davet daha önce cevaplanmış.");
        }

        invitation.setStatus(TeamInvitationStatus.ACCEPTED);
        invitation.setRespondedAt(LocalDateTime.now());
        teamInvitationRepository.save(invitation);

        TeamMember member = new TeamMember();
        member.setTeam(invitation.getTeam());
        member.setUser(invitation.getInvitedUser());
        member.setRole(TeamRole.MEMBER.name());
        member.setJoinedDate(LocalDateTime.now());
        teamMemberRepository.save(member);
        
        teamMemberRepository.findFirstByTeamIdAndRole(invitation.getTeam().getId(), TeamRole.OWNER.name())
            .ifPresent(ownerMember -> {
                notificationService.notifyTeamInvitationAccepted(
                    ownerMember.getUser(), 
                    invitation.getInvitedUser(), 
                    invitation.getTeam()
                );
            });
    }

    @Transactional
    public void rejectInvitation(Long invitationId, Long currentUserId) {
        TeamInvitation invitation = teamInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Bu davet artık geçerli değil."));

        if (!invitation.getInvitedUser().getId().equals(currentUserId)) {
            throw new org.springframework.security.access.AccessDeniedException("Bu daveti reddetme yetkiniz yok.");
        }

        if (invitation.getStatus() != TeamInvitationStatus.PENDING) {
            throw new ConflictException("Bu davet daha önce cevaplanmış.");
        }

        invitation.setStatus(TeamInvitationStatus.REJECTED);
        invitation.setRespondedAt(LocalDateTime.now());
        teamInvitationRepository.save(invitation);
        
        teamMemberRepository.findFirstByTeamIdAndRole(invitation.getTeam().getId(), TeamRole.OWNER.name())
            .ifPresent(ownerMember -> {
                notificationService.notifyTeamInvitationRejected(
                    ownerMember.getUser(), 
                    invitation.getInvitedUser(), 
                    invitation.getTeam()
                );
            });
    }
    @Transactional(readOnly = true)
    public List<TeamInvitationResponse> getPendingInvitations(Long currentUserId) {
        return teamInvitationRepository.findByInvitedUserIdAndStatus(currentUserId, TeamInvitationStatus.PENDING)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    @Transactional
    public void revokeInvitation(Long invitationId, Long requesterId) {
        TeamInvitation invitation = teamInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Davet bulunamadı."));

        if (invitation.getStatus() != TeamInvitationStatus.PENDING) {
            throw new ConflictException("Sadece bekleyen davetler geri çekilebilir.");
        }

        TeamMember membership = teamMemberRepository.findByTeamIdAndUserId(invitation.getTeam().getId(), requesterId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Bu işlem için yetkiniz yok"));
                
        String role = membership.getRole() == null ? "" : membership.getRole().trim().toUpperCase();
        if (!role.equals("OWNER") && !role.equals("ADMIN")) {
            throw new org.springframework.security.access.AccessDeniedException("Bu işlem için sadece Takım Sahibi veya Yönetici yetkilidir");
        }

        teamInvitationRepository.delete(invitation);
        notificationService.cleanupPendingInvitationNotification(invitation.getInvitedUser().getId(), invitation.getTeam().getId());
    }

    @Transactional(readOnly = true)
    public List<TeamInvitationResponse> getTeamPendingInvitations(Long teamId, Long requesterId) {
        if (!teamRepository.existsById(teamId)) {
            throw new ResourceNotFoundException("Takım bulunamadı");
        }
                
        TeamMember membership = teamMemberRepository.findByTeamIdAndUserId(teamId, requesterId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Bu işlem için yetkiniz yok"));
                
        String role = membership.getRole() == null ? "" : membership.getRole().trim().toUpperCase();
        if (!role.equals("OWNER") && !role.equals("ADMIN")) {
            throw new org.springframework.security.access.AccessDeniedException("Bu işlem için sadece Takım Sahibi veya Yönetici yetkilidir");
        }

        return teamInvitationRepository.findByTeamIdAndStatus(teamId, TeamInvitationStatus.PENDING)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    private TeamInvitationResponse convertToResponse(TeamInvitation inv) {
        return new TeamInvitationResponse(
                inv.getId(),
                inv.getTeam().getId(),
                inv.getTeam().getName(),
                inv.getInvitedBy().getName() + " " + inv.getInvitedBy().getSurname(),
                inv.getInvitedUser() != null ? inv.getInvitedUser().getName() + " " + inv.getInvitedUser().getSurname() : "",
                inv.getInvitedUser() != null ? inv.getInvitedUser().getUsername() : "",
                inv.getStatus(),
                inv.getCreatedAt()
        );
    }
}


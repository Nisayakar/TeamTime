package com.teamtime.repository;

import com.teamtime.entity.TeamInvitation;
import com.teamtime.entity.TeamInvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamInvitationRepository extends JpaRepository<TeamInvitation, Long> {
    
    List<TeamInvitation> findByInvitedUserIdAndStatus(Long invitedUserId, TeamInvitationStatus status);

    List<TeamInvitation> findByTeamIdAndStatus(Long teamId, TeamInvitationStatus status);

    boolean existsByTeamIdAndInvitedUserIdAndStatus(Long teamId, Long invitedUserId, TeamInvitationStatus status);

    void deleteByTeamId(Long teamId);
}

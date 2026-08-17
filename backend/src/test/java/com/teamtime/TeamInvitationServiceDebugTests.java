package com.teamtime;

import com.teamtime.dto.TeamRequest;
import com.teamtime.entity.Team;
import com.teamtime.entity.TeamInvitation;
import com.teamtime.entity.User;
import com.teamtime.repository.TeamInvitationRepository;
import com.teamtime.repository.TeamMemberRepository;
import com.teamtime.repository.UserRepository;
import com.teamtime.service.NotificationService;
import com.teamtime.service.TeamInvitationService;
import com.teamtime.service.TeamService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class TeamInvitationServiceDebugTests {

    @Test
    void testCreateInvitations() {
        TeamInvitationRepository teamInvitationRepository = Mockito.mock(TeamInvitationRepository.class);
        UserRepository userRepository = Mockito.mock(UserRepository.class);
        TeamMemberRepository teamMemberRepository = Mockito.mock(TeamMemberRepository.class);
        NotificationService notificationService = Mockito.mock(NotificationService.class);

        TeamInvitationService service = new TeamInvitationService(
                teamInvitationRepository,
                teamMemberRepository,
                userRepository,
                notificationService,
                null
        );

        User inviter = new User();
        inviter.setId(1L);
        inviter.setName("Owner");

        User invitee = new User();
        invitee.setId(2L);
        invitee.setName("Invitee");

        Team team = new Team();
        team.setId(10L);
        team.setName("Test Team");

        when(userRepository.findById(2L)).thenReturn(Optional.of(invitee));
        when(teamMemberRepository.findByTeamIdAndUserId(anyLong(), anyLong())).thenReturn(Optional.empty());
        when(teamInvitationRepository.existsByTeamIdAndInvitedUserIdAndStatus(anyLong(), anyLong(), any())).thenReturn(false);

        service.createInvitations(team, inviter, List.of(2L));

        ArgumentCaptor<TeamInvitation> captor = ArgumentCaptor.forClass(TeamInvitation.class);
        verify(teamInvitationRepository).save(captor.capture());

        TeamInvitation saved = captor.getValue();
        assertEquals(2L, saved.getInvitedUser().getId());
    }
}

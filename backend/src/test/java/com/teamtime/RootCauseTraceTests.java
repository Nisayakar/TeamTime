package com.teamtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teamtime.dto.TeamRequest;
import com.teamtime.entity.Notification;
import com.teamtime.entity.TeamInvitation;
import com.teamtime.entity.TeamInvitationStatus;
import com.teamtime.entity.User;
import com.teamtime.repository.NotificationRepository;
import com.teamtime.repository.TeamInvitationRepository;
import com.teamtime.repository.TeamRepository;
import com.teamtime.repository.UserRepository;
import com.teamtime.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class RootCauseTraceTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamInvitationRepository teamInvitationRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private JwtService jwtService;

    private User owner;
    private User invitee;
    private String ownerToken;
    private String inviteeToken;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        teamInvitationRepository.deleteAll();
        teamRepository.deleteAll();
        userRepository.deleteAll();

        owner = new User();
        owner.setName("Owner");
        owner.setSurname("User");
        owner.setUsername("owneruser");
        owner.setEmail("owner@example.com");
        owner.setPassword("hash");
        owner = userRepository.save(owner);

        invitee = new User();
        invitee.setName("Invitee");
        invitee.setSurname("User");
        invitee.setUsername("inviteeuser");
        invitee.setEmail("invitee@example.com");
        invitee.setPassword("hash");
        invitee = userRepository.save(invitee);

        ownerToken = "Bearer " + jwtService.generateToken(owner);
        inviteeToken = "Bearer " + jwtService.generateToken(invitee);
    }

    @Test
    void traceCreateTeamInvitationFlow() throws Exception {
        // 1. Create Team Request
        TeamRequest request = new TeamRequest();
        request.setName("Trace Team");
        request.setDescription("Trace Description");
        request.setMemberIds(List.of(invitee.getId()));

        String content = objectMapper.writeValueAsString(request);
        System.out.println("JSON Sent: " + content);

        mockMvc.perform(post("/api/teams")
                .header("Authorization", ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(content))
                .andExpect(status().isOk());

        // 2. Verify Invitation
        List<TeamInvitation> invitations = teamInvitationRepository.findAll();
        System.out.println("Invitations found: " + invitations.size());
        assertEquals(1, invitations.size(), "Invitation MUST be created");

        TeamInvitation invite = invitations.get(0);
        assertEquals(TeamInvitationStatus.PENDING, invite.getStatus());
        assertEquals(invitee.getId(), invite.getInvitedUser().getId());

        // 3. Verify Notification
        List<Notification> notifications = notificationRepository.findAll();
        System.out.println("Notifications found: " + notifications.size());
        assertEquals(1, notifications.size(), "Notification MUST be created");
        
        Notification notification = notifications.get(0);
        assertEquals(invitee.getId(), notification.getRecipient().getId(), "Recipient must be invitee");
        assertEquals("TEAM_INVITATION", notification.getType().name());

        // 4. Verify fetch notifications
        String getNotificationsResponse = mockMvc.perform(get("/api/notifications")
                .header("Authorization", inviteeToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        System.out.println("Invitee Notifications Response: " + getNotificationsResponse);
    }
}

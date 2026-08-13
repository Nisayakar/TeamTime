package com.teamtime;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teamtime.entity.Notification;
import com.teamtime.entity.NotificationType;
import com.teamtime.entity.Project;
import com.teamtime.entity.TeamRole;
import com.teamtime.entity.User;
import com.teamtime.repository.NotificationRepository;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskRepository;
import com.teamtime.repository.TeamMemberRepository;
import com.teamtime.repository.TeamRepository;
import com.teamtime.repository.UserRepository;
import com.teamtime.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:notification-tests;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "verification.code.secret=test-secret",
        "spring.mail.username=noreply@teamtime.test"
})
class NotificationTests {

    private static final String AUTHORIZATION = "Authorization";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamMemberRepository teamMemberRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private User owner;
    private User admin;
    private User member;
    private User outsider;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        teamMemberRepository.deleteAll();
        teamRepository.deleteAll();
        userRepository.deleteAll();

        owner = userRepository.save(new User(null, "Owner", "User", "notification-owner@example.com", "password"));
        admin = userRepository.save(new User(null, "Admin", "User", "notification-admin@example.com", "password"));
        member = userRepository.save(new User(null, "Member", "User", "notification-member@example.com", "password"));
        outsider = userRepository.save(new User(null, "Outsider", "User", "notification-outsider@example.com", "password"));
    }

    @Test
    void userReceivesNotificationWhenAddedToTeam() throws Exception {
        Long teamId = createTeam(owner, "Frontend Takımı");

        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);

        mockMvc.perform(get("/api/notifications")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].title").value("Takıma eklendiniz"))
                .andExpect(jsonPath("$.content[0].message").value("Frontend Takımı takımına Üye rolüyle eklendiniz."))
                .andExpect(jsonPath("$.content[0].type").value("TEAM_MEMBER_ADDED"))
                .andExpect(jsonPath("$.content[0].read").value(false))
                .andExpect(jsonPath("$.content[0].relatedEntityId").value(teamId))
                .andExpect(jsonPath("$.content[0].relatedEntityType").value("TEAM"));
    }

    @Test
    void automaticOwnerCreationDoesNotCreateNotification() throws Exception {
        createTeam(owner, "Owner Silent Team");

        mockMvc.perform(get("/api/notifications")
                .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    void removedUserReceivesRemovalNotification() throws Exception {
        Long teamId = createTeam(owner, "Removal Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);

        mockMvc.perform(delete("/api/teams/{teamId}/members/{userId}", teamId, member.getId())
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/notifications")
                .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].title").value("Takımdan çıkarıldınız"))
                .andExpect(jsonPath("$.content[0].type").value("TEAM_MEMBER_REMOVED"))
                .andExpect(jsonPath("$.content[0].relatedEntityId").value(teamId))
                .andExpect(jsonPath("$.content[0].relatedEntityType").value("TEAM"));
    }

    @Test
    void teamProjectCreationNotifiesOtherTeamMembersButNotCreator() throws Exception {
        Long teamId = createTeam(owner, "Project Team");
        addMember(owner, teamId, admin.getId(), TeamRole.ADMIN);
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);

        Long projectId = createTeamProject(owner, teamId, "Launch Project");

        mockMvc.perform(get("/api/notifications")
                .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].type").value("TEAM_PROJECT_CREATED"))
                .andExpect(jsonPath("$.content[0].relatedEntityId").value(projectId))
                .andExpect(jsonPath("$.content[0].relatedEntityType").value("PROJECT"));

        mockMvc.perform(get("/api/notifications")
                .header(AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].type").value("TEAM_PROJECT_CREATED"));

        mockMvc.perform(get("/api/notifications")
                .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    void teamTaskCreationNotifiesOtherMembers() throws Exception {
        Long teamId = createTeam(owner, "Task Team");
        addMember(owner, teamId, admin.getId(), TeamRole.ADMIN);
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);
        Long projectId = createTeamProject(owner, teamId, "Task Project");

        Long taskId = createTask(admin, projectId, "Review Task");

        mockMvc.perform(get("/api/notifications")
                .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].type").value("TEAM_TASK_CREATED"))
                .andExpect(jsonPath("$.content[0].relatedEntityId").value(taskId))
                .andExpect(jsonPath("$.content[0].relatedEntityType").value("TASK"));

        mockMvc.perform(get("/api/notifications")
                .header(AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].type").value("TEAM_PROJECT_CREATED"));
    }

    @Test
    void personalTaskCreationCreatesNoTeamNotification() throws Exception {
        Long projectId = createPersonalProject(owner, "Personal Project");

        createTask(owner, projectId, "Personal Task");

        mockMvc.perform(get("/api/notifications")
                .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    void userListsOnlyTheirNotifications() throws Exception {
        Long ownerTeamId = createTeam(owner, "Owner Team");
        Long outsiderTeamId = createTeam(outsider, "Outsider Team");
        addMember(owner, ownerTeamId, member.getId(), TeamRole.MEMBER);
        addMember(outsider, outsiderTeamId, admin.getId(), TeamRole.MEMBER);

        mockMvc.perform(get("/api/notifications")
                .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].relatedEntityId").value(ownerTeamId));
    }

    @Test
    void unreadCountIsCorrect() throws Exception {
        Long teamId = createTeam(owner, "Unread Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);

        mockMvc.perform(get("/api/notifications/unread-count")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1));
    }

    @Test
    void defaultNotificationPageUsesDefaultPageAndSize() throws Exception {
        for (int index = 1; index <= 3; index++) {
            createNotification(member, "Default Page " + index, LocalDateTime.now().plusMinutes(index));
        }

        mockMvc.perform(get("/api/notifications")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(3)))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void notificationPageIsNewestFirstAndIncludesCorrectTotals() throws Exception {
        createNotification(member, "Oldest", LocalDateTime.of(2026, 8, 1, 10, 0));
        createNotification(member, "Middle", LocalDateTime.of(2026, 8, 2, 10, 0));
        createNotification(member, "Newest", LocalDateTime.of(2026, 8, 3, 10, 0));

        mockMvc.perform(get("/api/notifications?page=0&size=2")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].title").value("Newest"))
                .andExpect(jsonPath("$.content[1].title").value("Middle"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.last").value(false));

        mockMvc.perform(get("/api/notifications?page=1&size=2")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].title").value("Oldest"))
                .andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void notificationPageIncludesOnlyCurrentUsersNotifications() throws Exception {
        createNotification(member, "Member Notification", LocalDateTime.of(2026, 8, 3, 10, 0));
        createNotification(outsider, "Outsider Notification", LocalDateTime.of(2026, 8, 4, 10, 0));

        mockMvc.perform(get("/api/notifications")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].title").value("Member Notification"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void notificationPageAllowsMaximumSize() throws Exception {
        createNotification(member, "Max Size", LocalDateTime.now());

        mockMvc.perform(get("/api/notifications?size=50")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(50));
    }

    @Test
    void notificationPageRejectsNegativePage() throws Exception {
        mockMvc.perform(get("/api/notifications?page=-1")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void notificationPageRejectsSizeAboveMaximum() throws Exception {
        mockMvc.perform(get("/api/notifications?size=51")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void userMarksOwnNotificationAsRead() throws Exception {
        Long teamId = createTeam(owner, "Read Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);
        Long notificationId = firstNotificationId(member);

        mockMvc.perform(put("/api/notifications/{id}/read", notificationId)
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));

        mockMvc.perform(get("/api/notifications/unread-count")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));
    }

    @Test
    void userCannotMarkAnotherUsersNotificationAsRead() throws Exception {
        Long teamId = createTeam(owner, "Private Notification Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);
        Long notificationId = firstNotificationId(member);

        mockMvc.perform(put("/api/notifications/{id}/read", notificationId)
                        .header(AUTHORIZATION, bearer(outsider)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void markAllReadAffectsOnlyCurrentUserNotifications() throws Exception {
        Long teamId = createTeam(owner, "Read All Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);
        addMember(owner, teamId, admin.getId(), TeamRole.MEMBER);

        mockMvc.perform(put("/api/notifications/read-all")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/notifications/unread-count")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));

        mockMvc.perform(get("/api/notifications/unread-count")
                        .header(AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1));
    }

    private Long createTeam(User creator, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/teams")
                        .header(AUTHORIZATION, bearer(creator))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "%s",
                                  "description": "Team description"
                                }
                                """.formatted(name)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    private void addMember(User actor, Long teamId, Long userId, TeamRole role) throws Exception {
        mockMvc.perform(post("/api/teams/{teamId}/members", teamId)
                        .header(AUTHORIZATION, bearer(actor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userId": %d,
                                  "role": "%s"
                                }
                                """.formatted(userId, role.name())))
                .andExpect(status().isOk());
    }

    private Long createPersonalProject(User actor, String name) throws Exception {
        mockMvc.perform(post("/api/projects")
                        .header(AUTHORIZATION, bearer(actor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "projectName": "%s",
                                  "description": "Personal description"
                                }
                                """.formatted(name)))
                .andExpect(status().isOk());

        return latestAccessibleProject(actor).getId();
    }

    private Long createTeamProject(User actor, Long teamId, String name) throws Exception {
        mockMvc.perform(post("/api/projects")
                        .header(AUTHORIZATION, bearer(actor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "projectName": "%s",
                                  "description": "Team description",
                                  "teamId": %d
                                }
                                """.formatted(name, teamId)))
                .andExpect(status().isOk());

        return latestAccessibleProject(actor).getId();
    }

    private Long createTask(User actor, Long projectId, String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/tasks/{projectId}", projectId)
                        .header(AUTHORIZATION, bearer(actor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "%s",
                                  "description": "Description",
                                  "status": "DEVAM_EDIYOR"
                                }
                                """.formatted(title)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    private Long firstNotificationId(User user) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/notifications")
                        .header(AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("content").get(0).get("id").asLong();
    }

    private void createNotification(User recipient, String title, LocalDateTime createdAt) {
        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setTitle(title);
        notification.setMessage(title + " message");
        notification.setType(NotificationType.TEAM_MEMBER_ADDED);
        notification.setRead(false);
        notification.setCreatedAt(createdAt);
        notification.setRelatedEntityId(1L);
        notification.setRelatedEntityType("TEAM");
        notificationRepository.save(notification);
    }

    private Project latestAccessibleProject(User actor) {
        return projectRepository.findAccessibleProjects(actor.getId()).getFirst();
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }
}

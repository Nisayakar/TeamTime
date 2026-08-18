package com.teamtime;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.empty;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teamtime.entity.AssignmentStatus;
import com.teamtime.entity.NotificationType;
import com.teamtime.entity.Project;
import com.teamtime.entity.Task;
import com.teamtime.entity.Team;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.TeamRole;
import com.teamtime.entity.User;
import com.teamtime.repository.NotificationRepository;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskRepository;
import com.teamtime.repository.TeamMemberRepository;
import com.teamtime.repository.TeamRepository;
import com.teamtime.repository.UserRepository;
import com.teamtime.security.JwtService;
import com.teamtime.service.TaskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:task-assignment-tests;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "verification.code.secret=test-secret",
        "spring.mail.username=noreply@teamtime.test"
})
class TaskAssignmentTests {

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

    @Autowired
    private TaskService taskService;

    private User owner;
    private User admin;
    private User member;
    private User otherMember;
    private User outsider;
    private Team team;
    private Long teamProjectId;
    private Long teamTaskId;

    @BeforeEach
    void setUp() throws Exception {
        notificationRepository.deleteAll();
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        teamMemberRepository.deleteAll();
        teamRepository.deleteAll();
        userRepository.deleteAll();

        owner = userRepository.save(new User(null, "Owner", "User", "assignment-owner@example.com", "password"));
        admin = userRepository.save(new User(null, "Admin", "User", "assignment-admin@example.com", "password"));
        member = userRepository.save(new User(null, "Member", "User", "assignment-member@example.com", "password"));
        otherMember = userRepository.save(new User(null, "Other", "Member", "assignment-other@example.com", "password"));
        outsider = userRepository.save(new User(null, "Outside", "User", "assignment-outsider@example.com", "password"));

        team = teamRepository.save(team("Assignment Team"));
        addMember(owner, TeamRole.OWNER);
        addMember(admin, TeamRole.ADMIN);
        addMember(member, TeamRole.MEMBER);
        addMember(otherMember, TeamRole.MEMBER);
        teamProjectId = projectRepository.save(project("Team Assignment Project", owner, team)).getId();
        teamTaskId = createTask(owner, teamProjectId, "Assigned Task", "BEKLIYOR");
    }

    @Test
    void ownerCanAssignTeamTaskToMemberAndNotificationIsCreated() throws Exception {
        assign(owner, teamTaskId, member)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedUserId").value(member.getId()))
                .andExpect(jsonPath("$.assignedUserName").value("Member User"))
                .andExpect(jsonPath("$.assignmentStatus").value("PENDING"))
                .andExpect(jsonPath("$.rejectionReason").value(nullValue()))
                .andExpect(jsonPath("$.assignedAt").value(notNullValue()))
                .andExpect(jsonPath("$.respondedAt").value(nullValue()));

        mockMvc.perform(getNotifications(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.type == 'TASK_ASSIGNED')]", hasSize(1)));
    }

    @Test
    void adminCanAssignTeamTask() throws Exception {
        assign(admin, teamTaskId, member)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedUserId").value(member.getId()))
                .andExpect(jsonPath("$.assignmentStatus").value("PENDING"));
    }

    @Test
    void memberCannotAssignTask() throws Exception {
        assign(member, teamTaskId, otherMember)
                .andExpect(status().isForbidden());
    }

    @Test
    void personalTaskCannotBeAssigned() throws Exception {
        Long personalProjectId = projectRepository.save(project("Personal Assignment Project", owner, null)).getId();
        Long personalTaskId = createTask(owner, personalProjectId, "Personal Task", "BEKLIYOR");

        assign(owner, personalTaskId, member)
                .andExpect(status().isBadRequest());
    }

    @Test
    void nonTeamUserAndOtherTeamMemberCannotBeAssigned() throws Exception {
        assign(owner, teamTaskId, outsider)
                .andExpect(status().isForbidden());

        Team otherTeam = teamRepository.save(team("Other Team"));
        addMember(otherTeam, outsider, TeamRole.MEMBER);

        assign(owner, teamTaskId, outsider)
                .andExpect(status().isForbidden());
    }

    @Test
    void assignedUserCanAcceptAndTaskStatusStaysIndependent() throws Exception {
        assign(owner, teamTaskId, member).andExpect(status().isOk());

        mockMvc.perform(post("/api/tasks/{id}/assignment/accept", teamTaskId)
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignmentStatus").value("ACCEPTED"))
                .andExpect(jsonPath("$.status").value("BEKLIYOR"))
                .andExpect(jsonPath("$.respondedAt").value(notNullValue()));

        mockMvc.perform(getNotifications(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.type == 'TASK_ASSIGNMENT_ACCEPTED')]", hasSize(1)));
    }

    @Test
    void otherUserCannotAcceptAssignment() throws Exception {
        assign(owner, teamTaskId, member).andExpect(status().isOk());

        mockMvc.perform(post("/api/tasks/{id}/assignment/accept", teamTaskId)
                        .header(AUTHORIZATION, bearer(otherMember)))
                .andExpect(status().isForbidden());
    }

    @Test
    void removedMemberCannotAcceptAssignment() throws Exception {
        assign(owner, teamTaskId, member).andExpect(status().isOk());
        removeMembership(team, member);

        mockMvc.perform(post("/api/tasks/{id}/assignment/accept", teamTaskId)
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isForbidden());
    }

    @Test
    void assignedUserCanRejectWithReasonAndNotificationIsCreated() throws Exception {
        assign(owner, teamTaskId, member).andExpect(status().isOk());

        mockMvc.perform(post("/api/tasks/{id}/assignment/reject", teamTaskId)
                        .header(AUTHORIZATION, bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "Bu tarihte başka görevim bulunuyor."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignmentStatus").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Bu tarihte başka görevim bulunuyor."))
                .andExpect(jsonPath("$.respondedAt").value(notNullValue()));

        mockMvc.perform(getNotifications(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.type == 'TASK_ASSIGNMENT_REJECTED')]", hasSize(1)));
    }

    @Test
    void removedMemberCannotRejectAssignment() throws Exception {
        assign(owner, teamTaskId, member).andExpect(status().isOk());
        removeMembership(team, member);

        reject(member, teamTaskId, "Artık takımda değilim")
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectReasonIsRequiredAndLimited() throws Exception {
        assign(owner, teamTaskId, member).andExpect(status().isOk());

        mockMvc.perform(post("/api/tasks/{id}/assignment/reject", teamTaskId)
                        .header(AUTHORIZATION, bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "   "
                                }
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/tasks/{id}/assignment/reject", teamTaskId)
                        .header(AUTHORIZATION, bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "%s"
                                }
                                """.formatted("x".repeat(501))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reassignmentClearsPreviousRejectionReason() throws Exception {
        assign(owner, teamTaskId, member).andExpect(status().isOk());
        reject(member, teamTaskId, "Uygun değil").andExpect(status().isOk());

        assign(owner, teamTaskId, member)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignmentStatus").value("PENDING"))
                .andExpect(jsonPath("$.rejectionReason").value(nullValue()))
                .andExpect(jsonPath("$.respondedAt").value(nullValue()));
    }

    @Test
    void assigneeCanBeRemoved() throws Exception {
        assign(owner, teamTaskId, member).andExpect(status().isOk());

        mockMvc.perform(delete("/api/tasks/{id}/assignee", teamTaskId)
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedUserId").value(nullValue()))
                .andExpect(jsonPath("$.assignmentStatus").value("UNASSIGNED"))
                .andExpect(jsonPath("$.rejectionReason").value(nullValue()))
                .andExpect(jsonPath("$.assignedAt").value(nullValue()))
                .andExpect(jsonPath("$.respondedAt").value(nullValue()));
    }

    @Test
    void cleanupRemovedMemberAssignmentsOnlyClearsTasksInThatTeam() throws Exception {
        assign(owner, teamTaskId, member).andExpect(status().isOk());

        Team otherTeam = teamRepository.save(team("Other Cleanup Team"));
        addMember(otherTeam, owner, TeamRole.OWNER);
        addMember(otherTeam, member, TeamRole.MEMBER);
        Long otherProjectId = projectRepository.save(project("Other Cleanup Project", owner, otherTeam)).getId();
        Long otherTaskId = createTask(owner, otherProjectId, "Other cleanup task", "BEKLIYOR");
        assign(owner, otherTaskId, member).andExpect(status().isOk());

        taskService.cleanupTasksForRemovedMember(team.getId(), member.getId());

        Task cleanedTask = taskRepository.findById(teamTaskId).orElseThrow();
        Task untouchedTask = taskRepository.findById(otherTaskId).orElseThrow();

        org.assertj.core.api.Assertions.assertThat(cleanedTask.getAssignedUser()).isNull();
        org.assertj.core.api.Assertions.assertThat(cleanedTask.getAssignmentStatus()).isEqualTo(AssignmentStatus.UNASSIGNED);
        org.assertj.core.api.Assertions.assertThat(cleanedTask.getRejectionReason()).isNull();
        org.assertj.core.api.Assertions.assertThat(cleanedTask.getAssignedAt()).isNull();
        org.assertj.core.api.Assertions.assertThat(cleanedTask.getRespondedAt()).isNull();

        org.assertj.core.api.Assertions.assertThat(untouchedTask.getAssignedUser()).isNotNull();
        org.assertj.core.api.Assertions.assertThat(untouchedTask.getAssignedUser().getId()).isEqualTo(member.getId());
        org.assertj.core.api.Assertions.assertThat(untouchedTask.getAssignmentStatus()).isEqualTo(AssignmentStatus.PENDING);
    }

    @Test
    void assignedTaskAppearsInCurrentUsersMyTasksOnly() throws Exception {
        assign(owner, teamTaskId, member).andExpect(status().isOk());

        mockMvc.perform(get("/api/tasks/my")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(teamTaskId))
                .andExpect(jsonPath("$[0].assignedUserId").value(member.getId()))
                .andExpect(jsonPath("$[0].assignmentStatus").value("PENDING"));

        mockMvc.perform(get("/api/tasks/my")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", empty()));
    }

    @Test
    void myTasksIncludesPersonalTasksWithoutAssignment() throws Exception {
        Long personalProjectId = projectRepository.save(project("Personal Project", owner, null)).getId();
        Long personalTaskId = createTask(owner, personalProjectId, "Personal Task", "BEKLIYOR");

        mockMvc.perform(get("/api/tasks/my")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(personalTaskId))
                .andExpect(jsonPath("$[0].assignedUserId").value(nullValue()))
                .andExpect(jsonPath("$[0].assignmentStatus").value("UNASSIGNED"));
    }

    @Test
    void myTasksExcludesUnassignedTasksAndTasksAssignedToOtherUsers() throws Exception {
        Long otherTaskId = createTask(owner, teamProjectId, "Other member task", "BEKLIYOR");
        assign(owner, otherTaskId, otherMember).andExpect(status().isOk());

        mockMvc.perform(get("/api/tasks/my")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", empty()));
    }

    @Test
    void myTasksIncludesPendingAcceptedRejectedAndCompletedAssignedTasks() throws Exception {
        Long pendingTaskId = teamTaskId;
        Long acceptedTaskId = createTask(owner, teamProjectId, "Accepted task", "BEKLIYOR");
        Long rejectedTaskId = createTask(owner, teamProjectId, "Rejected task", "BEKLIYOR");
        Long completedTaskId = createTask(owner, teamProjectId, "Completed task", "TAMAMLANDI");

        assign(owner, pendingTaskId, member).andExpect(status().isOk());
        assign(owner, acceptedTaskId, member).andExpect(status().isOk());
        assign(owner, rejectedTaskId, member).andExpect(status().isOk());
        assign(owner, completedTaskId, member).andExpect(status().isOk());
        mockMvc.perform(post("/api/tasks/{id}/assignment/accept", acceptedTaskId)
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk());
        reject(member, rejectedTaskId, "Takvimim dolu").andExpect(status().isOk());

        mockMvc.perform(get("/api/tasks/my")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[?(@.id == %d && @.assignmentStatus == 'PENDING')]".formatted(pendingTaskId), hasSize(1)))
                .andExpect(jsonPath("$[?(@.id == %d && @.assignmentStatus == 'ACCEPTED')]".formatted(acceptedTaskId), hasSize(1)))
                .andExpect(jsonPath("$[?(@.id == %d && @.assignmentStatus == 'REJECTED')]".formatted(rejectedTaskId), hasSize(1)))
                .andExpect(jsonPath("$[?(@.id == %d && @.status == 'TAMAMLANDI')]".formatted(completedTaskId), hasSize(1)));
    }

    @Test
    void myTasksDoesNotAcceptClientUserIdAndRequiresAuthentication() throws Exception {
        assign(owner, teamTaskId, member).andExpect(status().isOk());

        mockMvc.perform(get("/api/tasks/my")
                        .param("userId", String.valueOf(member.getId()))
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", empty()));

        mockMvc.perform(get("/api/tasks/my"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void assignedTaskRemainsVisibleInProjectScopeForOwner() throws Exception {
        assign(owner, teamTaskId, member).andExpect(status().isOk());

        mockMvc.perform(get("/api/tasks/project/{projectId}", teamProjectId)
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == %d)]".formatted(teamTaskId), hasSize(1)));
    }

    private org.springframework.test.web.servlet.ResultActions assign(User actor, Long taskId, User target) throws Exception {
        return mockMvc.perform(put("/api/tasks/{id}/assignee", taskId)
                .header(AUTHORIZATION, bearer(actor))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "userId": %d
                        }
                        """.formatted(target.getId())));
    }

    private org.springframework.test.web.servlet.ResultActions reject(User actor, Long taskId, String reason) throws Exception {
        return mockMvc.perform(post("/api/tasks/{id}/assignment/reject", taskId)
                .header(AUTHORIZATION, bearer(actor))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "reason": "%s"
                        }
                        """.formatted(reason)));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder getNotifications(User user) {
        return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/notifications")
                .param("page", "0")
                .param("size", "20")
                .header(AUTHORIZATION, bearer(user));
    }

    private Long createTask(User actor, Long projectId, String title, String status) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/tasks/{projectId}", projectId)
                        .header(AUTHORIZATION, bearer(actor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "%s",
                                  "description": "Task description",
                                  "status": "%s"
                                }
                                """.formatted(title, status)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    private void addMember(User user, TeamRole role) {
        addMember(team, user, role);
    }

    private void addMember(Team targetTeam, User user, TeamRole role) {
        TeamMember teamMember = new TeamMember();
        teamMember.setTeam(targetTeam);
        teamMember.setUser(user);
        teamMember.setRole(role.name());
        teamMemberRepository.save(teamMember);
    }

    private void removeMembership(Team targetTeam, User user) {
        TeamMember membership = teamMemberRepository.findByTeamIdAndUserId(targetTeam.getId(), user.getId()).orElseThrow();
        teamMemberRepository.delete(membership);
    }

    private Team team(String name) {
        Team newTeam = new Team();
        newTeam.setName(name);
        newTeam.setDescription("Team description");
        return newTeam;
    }

    private Project project(String name, User user, Team targetTeam) {
        Project project = new Project();
        project.setProjectName(name);
        project.setDescription("Project description");
        project.setUser(user);
        project.setTeam(targetTeam);
        return project;
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }
}

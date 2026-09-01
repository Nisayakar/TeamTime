package com.teamtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teamtime.entity.*;
import com.teamtime.repository.*;
import com.teamtime.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@org.springframework.test.context.ActiveProfiles("test")
public class TaskCommentTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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
    private TaskCommentRepository commentRepository;

    @Autowired
    private TaskAssignmentHistoryRepository taskAssignmentHistoryRepository;

    @Autowired
    private TeamInvitationRepository teamInvitationRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private JwtService jwtService;

    private User userA;
    private User userB;
    private User outsider;
    private Team team;
    private Project teamProject;
    private Project personalProject;
    private Task teamTask;
    private Task personalTask;

    @BeforeEach
    void setUp() {
        teamInvitationRepository.deleteAll();
        notificationRepository.deleteAll();
        commentRepository.deleteAll();
        taskAssignmentHistoryRepository.deleteAll();
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        teamMemberRepository.deleteAll();
        teamRepository.deleteAll();
        userRepository.deleteAll();

        userA = createUser("User A", "A", "usera", "usera@example.com");
        userB = createUser("User B", "B", "userb", "userb@example.com");
        outsider = createUser("Outsider", "Outsider", "outsider", "outsider@example.com");

        team = new Team();
        team.setName("Comment Team");
        team = teamRepository.save(team);

        // User A is OWNER, User B is MEMBER of the team
        addTeamMember(team, userA, "OWNER");
        addTeamMember(team, userB, "MEMBER");

        // Team Project
        teamProject = new Project();
        teamProject.setProjectName("Team Project");
        teamProject.setTeam(team);
        teamProject.setUser(userA);
        teamProject = projectRepository.save(teamProject);

        teamTask = new Task();
        teamTask.setTitle("Team Task");
        teamTask.setProject(teamProject);
        teamTask.setStatus("BEKLIYOR");
        teamTask = taskRepository.save(teamTask);

        // Personal Project owned by User A
        personalProject = new Project();
        personalProject.setProjectName("Personal Project");
        personalProject.setUser(userA);
        personalProject = projectRepository.save(personalProject);

        personalTask = new Task();
        personalTask.setTitle("Personal Task");
        personalTask.setProject(personalProject);
        personalTask.setStatus("BEKLIYOR");
        personalTask = taskRepository.save(personalTask);
    }

    private User createUser(String name, String surname, String username, String email) {
        User user = new User();
        user.setName(name);
        user.setSurname(surname);
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword("password");
        return userRepository.save(user);
    }

    private void addTeamMember(Team team, User user, String role) {
        TeamMember member = new TeamMember();
        member.setTeam(team);
        member.setUser(user);
        member.setRole(role);
        member.setJoinedDate(LocalDateTime.now());
        teamMemberRepository.save(member);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    @Test
    void teamProjectCommentsAuthorization() throws Exception {
        // User A (OWNER) can add and list comments
        mockMvc.perform(post("/api/tasks/{taskId}/comments", teamTask.getId())
                        .header("Authorization", bearer(userA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Comment from Owner\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Comment from Owner"))
                .andExpect(jsonPath("$.authorUsername").value("usera"));

        // User B (MEMBER) can add and list comments
        mockMvc.perform(post("/api/tasks/{taskId}/comments", teamTask.getId())
                        .header("Authorization", bearer(userB))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Comment from Member\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/tasks/{taskId}/comments", teamTask.getId())
                        .header("Authorization", bearer(userB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("Comment from Owner"))
                .andExpect(jsonPath("$[1].content").value("Comment from Member"));

        // Outsider (not in team) cannot read or write comments
        mockMvc.perform(post("/api/tasks/{taskId}/comments", teamTask.getId())
                        .header("Authorization", bearer(outsider))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"I am an outsider\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/tasks/{taskId}/comments", teamTask.getId())
                        .header("Authorization", bearer(outsider)))
                .andExpect(status().isForbidden());
    }

    @Test
    void personalProjectCommentsAuthorization() throws Exception {
        // Owner User A can add comment
        mockMvc.perform(post("/api/tasks/{taskId}/comments", personalTask.getId())
                        .header("Authorization", bearer(userA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Personal project comment\"}"))
                .andExpect(status().isOk());

        // Other users (even team member B) cannot access personal project comments
        mockMvc.perform(post("/api/tasks/{taskId}/comments", personalTask.getId())
                        .header("Authorization", bearer(userB))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Sneaky comment\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/tasks/{taskId}/comments", personalTask.getId())
                        .header("Authorization", bearer(userB)))
                .andExpect(status().isForbidden());
    }

    @Test
    void onlyAuthorCanDeleteComment() throws Exception {
        // User A creates comment
        MvcResult result = mockMvc.perform(post("/api/tasks/{taskId}/comments", teamTask.getId())
                        .header("Authorization", bearer(userA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Owner's comment\"}"))
                .andExpect(status().isOk())
                .andReturn();

        long commentId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        // User B (even as ADMIN/MEMBER) cannot delete A's comment
        mockMvc.perform(delete("/api/tasks/comments/{commentId}", commentId)
                        .header("Authorization", bearer(userB)))
                .andExpect(status().isForbidden());

        // User A can delete their own comment
        mockMvc.perform(delete("/api/tasks/comments/{commentId}", commentId)
                        .header("Authorization", bearer(userA)))
                .andExpect(status().isNoContent());

        // Comment should be deleted
        mockMvc.perform(get("/api/tasks/{taskId}/comments", teamTask.getId())
                        .header("Authorization", bearer(userA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void contentValidation() throws Exception {
        // Blank content is rejected
        mockMvc.perform(post("/api/tasks/{taskId}/comments", teamTask.getId())
                        .header("Authorization", bearer(userA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"   \"}"))
                .andExpect(status().isBadRequest());

        // Oversized content (>2000 chars) is rejected
        String longContent = "a".repeat(2001);
        mockMvc.perform(post("/api/tasks/{taskId}/comments", teamTask.getId())
                        .header("Authorization", bearer(userA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"" + longContent + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void taskAssignmentHistoryTracking() throws Exception {
        mockMvc.perform(get("/api/tasks/{id}/assignment-history", teamTask.getId())
                        .header("Authorization", bearer(userA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(put("/api/tasks/{id}/assignee", teamTask.getId())
                        .header("Authorization", bearer(userA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\": " + userB.getId() + "}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/tasks/{id}/assignment-history", teamTask.getId())
                        .header("Authorization", bearer(userA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("ASSIGNED"))
                .andExpect(jsonPath("$[0].assignedToUsername").value("userb"))
                .andExpect(jsonPath("$[0].assignedByUsername").value("usera"));

        mockMvc.perform(post("/api/tasks/{id}/assignment/reject", teamTask.getId())
                        .header("Authorization", bearer(userB))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\": \"Too busy\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/tasks/{id}/assignment-history", teamTask.getId())
                        .header("Authorization", bearer(userA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("REJECTED"))
                .andExpect(jsonPath("$[0].reason").value("Too busy"))
                .andExpect(jsonPath("$[1].eventType").value("ASSIGNED"));

        mockMvc.perform(put("/api/tasks/{id}/assignee", teamTask.getId())
                        .header("Authorization", bearer(userA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\": " + userB.getId() + "}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/tasks/{id}/assignment-history", teamTask.getId())
                        .header("Authorization", bearer(userA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("REASSIGNED"));

        mockMvc.perform(post("/api/tasks/{id}/assignment/accept", teamTask.getId())
                        .header("Authorization", bearer(userB)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/tasks/{id}/assignment-history", teamTask.getId())
                        .header("Authorization", bearer(userA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("ACCEPTED"));

        mockMvc.perform(delete("/api/tasks/{id}/assignee", teamTask.getId())
                        .header("Authorization", bearer(userA)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/tasks/{id}/assignment-history", teamTask.getId())
                        .header("Authorization", bearer(userA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("UNASSIGNED"));
    }

    @Test
    void deletingTaskAlsoDeletesCommentsAndAssignmentHistory() throws Exception {
        mockMvc.perform(post("/api/tasks/{taskId}/comments", teamTask.getId())
                        .header("Authorization", bearer(userA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Delete with task\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/tasks/{id}/assignee", teamTask.getId())
                        .header("Authorization", bearer(userA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\": " + userB.getId() + "}"))
                .andExpect(status().isOk());

        assertThat(commentRepository.findByTaskIdOrderByCreatedAtAsc(teamTask.getId())).hasSize(1);
        assertThat(taskAssignmentHistoryRepository.findByTaskIdOrderByCreatedAtDesc(teamTask.getId())).hasSize(1);

        mockMvc.perform(delete("/api/tasks/{id}", teamTask.getId())
                        .header("Authorization", bearer(userA)))
                .andExpect(status().isOk());

        assertThat(taskRepository.findById(teamTask.getId())).isEmpty();
        assertThat(commentRepository.findByTaskIdOrderByCreatedAtAsc(teamTask.getId())).isEmpty();
        assertThat(taskAssignmentHistoryRepository.findByTaskIdOrderByCreatedAtDesc(teamTask.getId())).isEmpty();
    }
}

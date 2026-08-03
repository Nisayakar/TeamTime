package com.teamtime;

import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teamtime.entity.Project;
import com.teamtime.entity.Task;
import com.teamtime.entity.TaskPriority;
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

import java.time.LocalDate;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:task-metadata-tests;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "verification.code.secret=test-secret",
        "spring.mail.username=noreply@teamtime.test"
})
class TaskMetadataTests {

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

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        teamMemberRepository.deleteAll();
        teamRepository.deleteAll();
        userRepository.deleteAll();

        owner = userRepository.save(new User(null, "Task", "Owner", "task-owner@example.com", "password"));
    }

    @Test
    void missingPriorityDefaultsToMedium() throws Exception {
        Long projectId = createPersonalProject("Priority Default Project");

        mockMvc.perform(post("/api/tasks/{projectId}", projectId)
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Default Priority Task",
                                  "description": "No explicit priority",
                                  "status": "BEKLIYOR"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priority").value("MEDIUM"))
                .andExpect(jsonPath("$.createdAt").value(notNullValue()))
                .andExpect(jsonPath("$.completedAt").value(nullValue()));
    }

    @Test
    void explicitPriorityAndDueDatePersist() throws Exception {
        Long projectId = createPersonalProject("Priority Project");
        String dueDate = LocalDate.now().plusDays(2).toString();

        mockMvc.perform(post("/api/tasks/{projectId}", projectId)
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Urgent Task",
                                  "description": "Has due date",
                                  "status": "DEVAM_EDIYOR",
                                  "priority": "URGENT",
                                  "dueDate": "%s"
                                }
                                """.formatted(dueDate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priority").value("URGENT"))
                .andExpect(jsonPath("$.dueDate").value(dueDate))
                .andExpect(jsonPath("$.overdue").value(false));
    }

    @Test
    void overdueIsFalseForCompletedPastDueTask() throws Exception {
        Long projectId = createPersonalProject("Completed Project");
        Long taskId = createTask(projectId, "Completed Task");
        Task task = taskRepository.findById(taskId).orElseThrow();
        task.setDueDate(LocalDate.now().minusDays(1));
        taskRepository.save(task);

        mockMvc.perform(put("/api/tasks/{id}", taskId)
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Completed Task",
                                  "description": "Done",
                                  "status": "TAMAMLANDI",
                                  "priority": "HIGH",
                                  "dueDate": "%s"
                                }
                                """.formatted(LocalDate.now().minusDays(1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedAt").value(notNullValue()))
                .andExpect(jsonPath("$.overdue").value(false));
    }

    @Test
    void overdueIsTrueForUnfinishedPastDueTask() throws Exception {
        Long projectId = createPersonalProject("Overdue Project");
        Long taskId = createTask(projectId, "Overdue Task");
        Task task = taskRepository.findById(taskId).orElseThrow();
        task.setDueDate(LocalDate.now().minusDays(1));
        taskRepository.save(task);

        mockMvc.perform(get("/api/tasks/project/{projectId}", projectId)
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(taskId))
                .andExpect(jsonPath("$[0].overdue").value(true));
    }

    @Test
    void completedAtClearsWhenTaskIsReopened() throws Exception {
        Long projectId = createPersonalProject("Reopen Project");
        Long taskId = createTask(projectId, "Reopen Task");

        mockMvc.perform(put("/api/tasks/{id}", taskId)
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Reopen Task",
                                  "description": "Done",
                                  "status": "TAMAMLANDI",
                                  "priority": "MEDIUM"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedAt").value(notNullValue()));

        mockMvc.perform(put("/api/tasks/{id}", taskId)
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Reopen Task",
                                  "description": "Open again",
                                  "status": "DEVAM_EDIYOR",
                                  "priority": "MEDIUM"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedAt").value(nullValue()));
    }

    @Test
    void pastDueDateIsRejectedForNewTasks() throws Exception {
        Long projectId = createPersonalProject("Past Due Project");

        mockMvc.perform(post("/api/tasks/{projectId}", projectId)
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Past Due Task",
                                  "description": "Invalid due date",
                                  "status": "BEKLIYOR",
                                  "priority": "LOW",
                                  "dueDate": "%s"
                                }
                                """.formatted(LocalDate.now().minusDays(1))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void malformedPriorityAndDateReturnBadRequestJson() throws Exception {
        Long projectId = createPersonalProject("Malformed Project");

        mockMvc.perform(post("/api/tasks/{projectId}", projectId)
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Malformed Priority",
                                  "priority": "NOW"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        mockMvc.perform(post("/api/tasks/{projectId}", projectId)
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Malformed Date",
                                  "dueDate": "not-a-date"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    private Long createPersonalProject(String name) throws Exception {
        mockMvc.perform(post("/api/projects")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "projectName": "%s",
                                  "description": "Personal description"
                                }
                                """.formatted(name)))
                .andExpect(status().isOk());

        Project project = projectRepository.findAccessibleProjects(owner.getId()).getFirst();
        return project.getId();
    }

    private Long createTask(Long projectId, String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/tasks/{projectId}", projectId)
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "%s",
                                  "description": "Task description",
                                  "status": "BEKLIYOR"
                                }
                                """.formatted(title)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }
}

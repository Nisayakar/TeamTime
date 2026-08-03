package com.teamtime;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teamtime.entity.Project;
import com.teamtime.entity.TeamRole;
import com.teamtime.entity.User;
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

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:project-team-authorization;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "verification.code.secret=test-secret",
        "spring.mail.username=noreply@teamtime.test"
})
class ProjectTeamAuthorizationTests {

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

    private User owner;
    private User admin;
    private User member;
    private User outsider;

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        teamMemberRepository.deleteAll();
        teamRepository.deleteAll();
        userRepository.deleteAll();

        owner = userRepository.save(new User(null, "Owner", "User", "owner-project@example.com", "password"));
        admin = userRepository.save(new User(null, "Admin", "User", "admin-project@example.com", "password"));
        member = userRepository.save(new User(null, "Member", "User", "member-project@example.com", "password"));
        outsider = userRepository.save(new User(null, "Outsider", "User", "outsider-project@example.com", "password"));
    }

    @Test
    void personalProjectCreationStillWorksAndIsPrivate() throws Exception {
        Long personalProjectId = createPersonalProject(owner, "Personal Plan");

        mockMvc.perform(get("/api/projects/{id}", personalProjectId)
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectName").value("Personal Plan"))
                .andExpect(jsonPath("$.teamProject").value(false));

        mockMvc.perform(get("/api/projects/{id}", personalProjectId)
                        .header(AUTHORIZATION, bearer(outsider)))
                .andExpect(status().isNotFound());
    }

    @Test
    void ownerAndAdminCanCreateTeamProjects() throws Exception {
        Long teamId = createTeam(owner, "Delivery Team");
        addMember(owner, teamId, admin.getId(), TeamRole.ADMIN);

        Long ownerProjectId = createTeamProject(owner, teamId, "Owner Team Project");
        Long adminProjectId = createTeamProject(admin, teamId, "Admin Team Project");

        mockMvc.perform(get("/api/projects/{id}", ownerProjectId)
                        .header(AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teamId").value(teamId))
                .andExpect(jsonPath("$.teamName").value("Delivery Team"))
                .andExpect(jsonPath("$.teamProject").value(true));

        mockMvc.perform(get("/api/projects/{id}", adminProjectId)
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teamId").value(teamId));
    }

    @Test
    void memberAndNonMemberCannotCreateTeamProject() throws Exception {
        Long teamId = createTeam(owner, "Restricted Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);

        mockMvc.perform(post("/api/projects")
                        .header(AUTHORIZATION, bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(teamProjectJson(teamId, "Member Attempt")))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/projects")
                        .header(AUTHORIZATION, bearer(outsider))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(teamProjectJson(teamId, "Outsider Attempt")))
                .andExpect(status().isForbidden());
    }

    @Test
    void teamMemberCanViewButCannotUpdateOrDeleteTeamProject() throws Exception {
        Long teamId = createTeam(owner, "Viewer Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);
        Long projectId = createTeamProject(owner, teamId, "Shared Project");

        mockMvc.perform(get("/api/projects/{id}", projectId)
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectName").value("Shared Project"));

        mockMvc.perform(put("/api/projects/{id}", projectId)
                        .header(AUTHORIZATION, bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "projectName": "Blocked"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/projects/{id}", projectId)
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isForbidden());
    }

    @Test
    void ownerAndAdminCanUpdateAndDeleteTeamProject() throws Exception {
        Long teamId = createTeam(owner, "Manager Team");
        addMember(owner, teamId, admin.getId(), TeamRole.ADMIN);
        Long projectForAdmin = createTeamProject(owner, teamId, "Admin Editable");
        Long projectForOwner = createTeamProject(admin, teamId, "Owner Deletable");

        mockMvc.perform(put("/api/projects/{id}", projectForAdmin)
                        .header(AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "projectName": "Admin Updated"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/projects/{id}", projectForOwner)
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk());
    }

    @Test
    void nonMemberCannotViewTeamProject() throws Exception {
        Long teamId = createTeam(owner, "Private Project Team");
        Long projectId = createTeamProject(owner, teamId, "Private Team Project");

        mockMvc.perform(get("/api/projects/{id}", projectId)
                        .header(AUTHORIZATION, bearer(outsider)))
                .andExpect(status().isNotFound());
    }

    @Test
    void taskAuthorizationFollowsTeamRoles() throws Exception {
        Long teamId = createTeam(owner, "Task Team");
        addMember(owner, teamId, admin.getId(), TeamRole.ADMIN);
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);
        Long projectId = createTeamProject(owner, teamId, "Task Project");
        Long taskId = createTask(owner, projectId);

        mockMvc.perform(get("/api/tasks/project/{projectId}", projectId)
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        mockMvc.perform(put("/api/tasks/{id}", taskId)
                        .header(AUTHORIZATION, bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(taskJson("Blocked Task", "Blocked", "DEVAM_EDIYOR")))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/tasks/{id}", taskId)
                        .header(AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(taskJson("Updated Task", "Updated", "TAMAMLANDI")))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/tasks/{id}", taskId)
                        .header(AUTHORIZATION, bearer(outsider)))
                .andExpect(status().isForbidden());
    }

    @Test
    void teamWithAttachedProjectsCannotBeDeleted() throws Exception {
        Long teamId = createTeam(owner, "Project Attached Team");
        createTeamProject(owner, teamId, "Attached Project");

        mockMvc.perform(delete("/api/teams/{teamId}", teamId)
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void projectListReturnsPersonalAndJoinedTeamProjectsWithoutDuplicates() throws Exception {
        Long teamId = createTeam(owner, "List Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);
        createPersonalProject(member, "Member Personal");
        createTeamProject(owner, teamId, "Joined Team Project");

        mockMvc.perform(get("/api/projects")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
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
                        .content(teamProjectJson(teamId, name)))
                .andExpect(status().isOk());

        return latestAccessibleProject(actor).getId();
    }

    private Long createTask(User actor, Long projectId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/tasks/{projectId}", projectId)
                        .header(AUTHORIZATION, bearer(actor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(taskJson("Initial Task", "Description", "DEVAM_EDIYOR")))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    private Project latestAccessibleProject(User actor) {
        return projectRepository.findAccessibleProjects(actor.getId()).getFirst();
    }

    private String teamProjectJson(Long teamId, String name) {
        return """
                {
                  "projectName": "%s",
                  "description": "Team description",
                  "teamId": %d
                }
                """.formatted(name, teamId);
    }

    private String taskJson(String title, String description, String status) {
        return """
                {
                  "title": "%s",
                  "description": "%s",
                  "status": "%s"
                }
                """.formatted(title, description, status);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }
}

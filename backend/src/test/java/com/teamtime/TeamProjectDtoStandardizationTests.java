package com.teamtime;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teamtime.entity.Project;
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
        "spring.datasource.url=jdbc:h2:mem:team-project-dto-standardization;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "verification.code.secret=test-secret",
        "spring.mail.username=noreply@teamtime.test"
})
class TeamProjectDtoStandardizationTests {

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

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        teamMemberRepository.deleteAll();
        teamRepository.deleteAll();
        userRepository.deleteAll();

        owner = userRepository.save(new User(null, "Owner", "User", "dto-owner@example.com", "password"));
        admin = userRepository.save(new User(null, "Admin", "User", "dto-admin@example.com", "password"));
    }

    @Test
    void blankTeamNameIsRejected() throws Exception {
        mockMvc.perform(post("/api/teams")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "   ",
                                  "description": "Team description"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.fieldErrors.name").value("Takım adı boş bırakılamaz"));
    }

    @Test
    void blankProjectNameIsRejected() throws Exception {
        mockMvc.perform(post("/api/projects")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "projectName": "   ",
                                  "description": "Project description"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.fieldErrors.projectName").value("Proje adı boş bırakılamaz"));
    }

    @Test
    void invalidProjectDateRangeIsRejected() throws Exception {
        mockMvc.perform(post("/api/projects")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "projectName": "Date Test",
                                  "startDate": "2026-08-10",
                                  "endDate": "2026-08-09"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    @Test
    void namesAndDescriptionsAreTrimmedAndSerializedThroughResponses() throws Exception {
        Long teamId = createTeam(owner, "  Platform Team  ", "  Team description  ");

        mockMvc.perform(get("/api/teams")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(teamId))
                .andExpect(jsonPath("$[0].name").value("Platform Team"))
                .andExpect(jsonPath("$[0].description").value("Team description"))
                .andExpect(jsonPath("$[0].createdDate").hasJsonPath());

        Long projectId = createProject(owner, "  Launch Plan  ", "  Project description  ", teamId);

        mockMvc.perform(get("/api/projects/{id}", projectId)
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(projectId))
                .andExpect(jsonPath("$.projectName").value("Launch Plan"))
                .andExpect(jsonPath("$.description").value("Project description"))
                .andExpect(jsonPath("$.startDate").value(nullValue()))
                .andExpect(jsonPath("$.endDate").value(nullValue()))
                .andExpect(jsonPath("$.teamId").value(teamId))
                .andExpect(jsonPath("$.teamName").value("Platform Team"))
                .andExpect(jsonPath("$.teamProject").value(true));
    }

    @Test
    void optionalBlankDescriptionsAndDateStringsRemainFrontendCompatible() throws Exception {
        mockMvc.perform(post("/api/projects")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "projectName": "No Optional Fields",
                                  "description": "",
                                  "startDate": "",
                                  "endDate": ""
                                }
                                """))
                .andExpect(status().isOk());

        Project project = projectRepository.findAccessibleProjects(owner.getId()).getFirst();

        mockMvc.perform(get("/api/projects/{id}", project.getId())
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value(nullValue()))
                .andExpect(jsonPath("$.startDate").value(nullValue()))
                .andExpect(jsonPath("$.endDate").value(nullValue()));
    }

    @Test
    void teamNameIsDerivedFromTeamAndFrontendProjectFieldsStayPresent() throws Exception {
        Long teamId = createTeam(owner, "Delivery Team", "Team description");
        Long projectId = createProject(owner, "Delivery Project", "Project description", teamId);

        Team team = teamRepository.findById(teamId).orElseThrow();
        team.setName("Renamed Delivery Team");
        teamRepository.save(team);

        mockMvc.perform(get("/api/projects/{id}", projectId)
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").hasJsonPath())
                .andExpect(jsonPath("$.projectName").hasJsonPath())
                .andExpect(jsonPath("$.description").hasJsonPath())
                .andExpect(jsonPath("$.startDate").hasJsonPath())
                .andExpect(jsonPath("$.endDate").hasJsonPath())
                .andExpect(jsonPath("$.teamId").hasJsonPath())
                .andExpect(jsonPath("$.teamName").value("Renamed Delivery Team"))
                .andExpect(jsonPath("$.teamProject").value(true));
    }

    @Test
    void teamAuthorizationStillAllowsAdminUpdate() throws Exception {
        Long teamId = createTeam(owner, "Managed Team", "Team description");
        addMember(teamId, admin, TeamRole.ADMIN);

        mockMvc.perform(put("/api/teams/{teamId}", teamId)
                        .header(AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Admin Updated Team",
                                  "description": "Updated description"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Admin Updated Team"))
                .andExpect(jsonPath("$.description").value("Updated description"));
    }

    @Test
    void recentProjectsReturnsNewestFiveByIdWhenNoCreatedAtExists() throws Exception {
        for (int index = 1; index <= 6; index++) {
            createProject(owner, "Recent Project " + index, "Description " + index, null);
        }

        mockMvc.perform(get("/api/projects/recent")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)))
                .andExpect(jsonPath("$[0].projectName").value("Recent Project 6"))
                .andExpect(jsonPath("$[4].projectName").value("Recent Project 2"));
    }

    private Long createTeam(User creator, String name, String description) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/teams")
                        .header(AUTHORIZATION, bearer(creator))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "%s",
                                  "description": "%s"
                                }
                                """.formatted(name, description)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    private Long createProject(User actor, String name, String description, Long teamId) throws Exception {
        String teamIdJson = teamId == null ? "null" : teamId.toString();

        mockMvc.perform(post("/api/projects")
                        .header(AUTHORIZATION, bearer(actor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "projectName": "%s",
                                  "description": "%s",
                                  "teamId": %s
                                }
                                """.formatted(name, description, teamIdJson)))
                .andExpect(status().isOk());

        return projectRepository.findAccessibleProjects(actor.getId()).getFirst().getId();
    }

    private void addMember(Long teamId, User user, TeamRole role) {
        TeamMember member = new TeamMember();
        member.setTeam(teamRepository.findById(teamId).orElseThrow());
        member.setUser(user);
        member.setRole(role.name());
        member.setJoinedDate(java.time.LocalDateTime.now());
        teamMemberRepository.save(member);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }
}

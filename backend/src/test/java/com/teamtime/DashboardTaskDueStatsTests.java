package com.teamtime;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.teamtime.entity.Project;
import com.teamtime.entity.Task;
import com.teamtime.entity.TaskPriority;
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
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:dashboard-task-due-stats;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "verification.code.secret=test-secret",
        "spring.mail.username=noreply@teamtime.test"
})
class DashboardTaskDueStatsTests {

    private static final String AUTHORIZATION = "Authorization";

    @Autowired
    private MockMvc mockMvc;

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
    private User member;
    private User outsider;
    private Project personalProject;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        teamMemberRepository.deleteAll();
        teamRepository.deleteAll();
        userRepository.deleteAll();

        owner = userRepository.save(new User(null, "Dashboard", "Owner", "dashboard-owner@example.com", "password"));
        member = userRepository.save(new User(null, "Dashboard", "Member", "dashboard-member@example.com", "password"));
        outsider = userRepository.save(new User(null, "Dashboard", "Outsider", "dashboard-outsider@example.com", "password"));
        personalProject = saveProject("Personal Dashboard Project", owner, null);
    }

    @Test
    void dashboardCountsOverdueDueTodayAndUpcomingAccessibleTasks() throws Exception {
        LocalDate today = LocalDate.now();
        saveTask("Overdue", personalProject, "BEKLIYOR", TaskPriority.HIGH, today.minusDays(1), 1);
        saveTask("Completed Past Due", personalProject, "TAMAMLANDI", TaskPriority.URGENT, today.minusDays(2), 2);
        saveTask("Due Today", personalProject, "DEVAM_EDIYOR", TaskPriority.MEDIUM, today, 3);
        saveTask("Upcoming", personalProject, "BEKLIYOR", TaskPriority.LOW, today.plusDays(1), 4);
        saveTask("No Date", personalProject, "BEKLIYOR", TaskPriority.LOW, null, 5);

        mockMvc.perform(get("/api/dashboard")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overdueTaskCount").value(1))
                .andExpect(jsonPath("$.dueTodayTaskCount").value(1))
                .andExpect(jsonPath("$.upcomingTaskCount").value(1));
    }

    @Test
    void inaccessibleTasksAreExcludedFromDashboardCounts() throws Exception {
        LocalDate today = LocalDate.now();
        Project outsiderProject = saveProject("Private Outsider Project", outsider, null);
        saveTask("Owner Due Today", personalProject, "BEKLIYOR", TaskPriority.MEDIUM, today, 1);
        saveTask("Outsider Due Today", outsiderProject, "BEKLIYOR", TaskPriority.MEDIUM, today, 2);

        mockMvc.perform(get("/api/dashboard")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dueTodayTaskCount").value(1));
    }

    @Test
    void teamMemberAccessibleTasksAreIncludedInDashboardCounts() throws Exception {
        LocalDate today = LocalDate.now();
        Team team = saveTeam("Shared Dashboard Team");
        addTeamMember(team, owner, TeamRole.OWNER);
        addTeamMember(team, member, TeamRole.MEMBER);
        Project teamProject = saveProject("Shared Dashboard Project", owner, team);
        saveTask("Shared Upcoming", teamProject, "BEKLIYOR", TaskPriority.HIGH, today.plusDays(2), 1);

        mockMvc.perform(get("/api/dashboard")
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upcomingTaskCount").value(1))
                .andExpect(jsonPath("$.taskCount").value(1));
    }

    @Test
    void dashboardProjectCountIncludesPersonalAndAllJoinedTeamProjects() throws Exception {
        Team ownerTeam = saveTeam("Owner Project Count Team");
        addTeamMember(ownerTeam, owner, TeamRole.OWNER);
        Project ownerTeamProject = saveProject("Owner Team Project", owner, ownerTeam);

        Team adminTeam = saveTeam("Admin Project Count Team");
        addTeamMember(adminTeam, outsider, TeamRole.OWNER);
        addTeamMember(adminTeam, owner, TeamRole.ADMIN);
        Project adminTeamProject = saveProject("Admin Team Project", outsider, adminTeam);

        Team memberTeam = saveTeam("Member Project Count Team");
        addTeamMember(memberTeam, outsider, TeamRole.OWNER);
        addTeamMember(memberTeam, owner, TeamRole.MEMBER);
        Project memberTeamProject = saveProject("Member Team Project", outsider, memberTeam);

        Team inaccessibleTeam = saveTeam("Inaccessible Project Count Team");
        addTeamMember(inaccessibleTeam, outsider, TeamRole.OWNER);
        saveProject("Inaccessible Team Project", outsider, inaccessibleTeam);
        saveProject("Other Personal Project", outsider, null);

        mockMvc.perform(get("/api/dashboard")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectCount").value(4));

        mockMvc.perform(get("/api/projects")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[?(@.id == %d)]".formatted(personalProject.getId()), hasSize(1)))
                .andExpect(jsonPath("$[?(@.id == %d)]".formatted(ownerTeamProject.getId()), hasSize(1)))
                .andExpect(jsonPath("$[?(@.id == %d)]".formatted(adminTeamProject.getId()), hasSize(1)))
                .andExpect(jsonPath("$[?(@.id == %d)]".formatted(memberTeamProject.getId()), hasSize(1)));
    }

    @Test
    void dashboardProjectCountDoesNotDuplicateProjectsWhenMembershipRowsDuplicate() throws Exception {
        Team team = saveTeam("Duplicate Membership Team");
        addTeamMember(team, owner, TeamRole.MEMBER);
        addTeamMember(team, owner, TeamRole.ADMIN);
        saveProject("Duplicate Safe Team Project", outsider, team);

        mockMvc.perform(get("/api/dashboard")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectCount").value(2));

        mockMvc.perform(get("/api/projects")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void upcomingEndpointOrdersByDueDatePriorityAndCreatedAt() throws Exception {
        LocalDate today = LocalDate.now();
        saveTask("Tomorrow Low", personalProject, "BEKLIYOR", TaskPriority.LOW, today.plusDays(1), 1);
        saveTask("Today High Old", personalProject, "BEKLIYOR", TaskPriority.HIGH, today, 2);
        saveTask("Today Urgent", personalProject, "BEKLIYOR", TaskPriority.URGENT, today, 3);
        saveTask("Today High New", personalProject, "BEKLIYOR", TaskPriority.HIGH, today, 4);

        mockMvc.perform(get("/api/tasks/upcoming")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].title").value("Today Urgent"))
                .andExpect(jsonPath("$[1].title").value("Today High New"))
                .andExpect(jsonPath("$[2].title").value("Today High Old"))
                .andExpect(jsonPath("$[3].title").value("Tomorrow Low"));
    }

    @Test
    void upcomingEndpointExcludesCompletedTasksAndEnforcesLimit() throws Exception {
        LocalDate today = LocalDate.now();
        saveTask("Completed Today", personalProject, "TAMAMLANDI", TaskPriority.URGENT, today, 1);

        for (int index = 0; index < 6; index++) {
            saveTask("Upcoming " + index, personalProject, "BEKLIYOR", TaskPriority.MEDIUM, today.plusDays(index), index + 2);
        }

        mockMvc.perform(get("/api/tasks/upcoming")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)))
                .andExpect(jsonPath("$[0].title").value("Upcoming 0"));
    }

    @Test
    void upcomingEndpointIncludesProjectSummaryFields() throws Exception {
        LocalDate today = LocalDate.now();
        saveTask("Project Linked", personalProject, "BEKLIYOR", TaskPriority.MEDIUM, today, 1);

        mockMvc.perform(get("/api/tasks/upcoming")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].projectId").value(personalProject.getId()))
                .andExpect(jsonPath("$[0].projectName").value("Personal Dashboard Project"));
    }

    private Project saveProject(String name, User user, Team team) {
        Project project = new Project();
        project.setProjectName(name);
        project.setDescription("Dashboard project description");
        project.setUser(user);
        project.setTeam(team);
        return projectRepository.save(project);
    }

    private Team saveTeam(String name) {
        Team team = new Team();
        team.setName(name);
        team.setDescription("Dashboard team description");
        team.setCreatedDate(LocalDateTime.now());
        return teamRepository.save(team);
    }

    private void addTeamMember(Team team, User user, TeamRole role) {
        TeamMember membership = new TeamMember();
        membership.setTeam(team);
        membership.setUser(user);
        membership.setRole(role.name());
        membership.setJoinedDate(LocalDateTime.now());
        teamMemberRepository.save(membership);
    }

    private void saveTask(String title, Project project, String status, TaskPriority priority, LocalDate dueDate, int createdAtOffset) {
        Task task = new Task();
        task.setTitle(title);
        task.setDescription("Dashboard task description");
        task.setStatus(status);
        task.setPriority(priority);
        task.setDueDate(dueDate);
        task.setCreatedAt(LocalDateTime.now().plusMinutes(createdAtOffset));
        task.setProject(project);
        taskRepository.save(task);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }
}

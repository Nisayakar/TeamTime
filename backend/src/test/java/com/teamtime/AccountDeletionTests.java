package com.teamtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.teamtime.entity.Notification;
import com.teamtime.entity.NotificationType;
import com.teamtime.entity.PasswordResetRequest;
import com.teamtime.entity.PendingRegistration;
import com.teamtime.entity.Project;
import com.teamtime.entity.Task;
import com.teamtime.entity.Team;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.TeamRole;
import com.teamtime.entity.User;
import com.teamtime.repository.NotificationRepository;
import com.teamtime.repository.PasswordResetRequestRepository;
import com.teamtime.repository.PendingRegistrationRepository;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskRepository;
import com.teamtime.repository.TeamMemberRepository;
import com.teamtime.repository.TeamRepository;
import com.teamtime.repository.UserRepository;
import com.teamtime.security.JwtService;
import com.teamtime.service.VerificationCodeGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDateTime;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:account-deletion;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "verification.code.secret=test-secret",
        "spring.mail.username=noreply@teamtime.test"
})
class AccountDeletionTests {

    private static final String AUTHORIZATION = "Authorization";

    @Autowired
    private MockMvc mockMvc;

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
    private PasswordResetRequestRepository passwordResetRequestRepository;

    @Autowired
    private PendingRegistrationRepository pendingRegistrationRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private VerificationCodeGenerator verificationCodeGenerator;

    @MockBean
    private JavaMailSender javaMailSender;

    private User owner;
    private User otherUser;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        teamMemberRepository.deleteAll();
        teamRepository.deleteAll();
        passwordResetRequestRepository.deleteAll();
        pendingRegistrationRepository.deleteAll();
        userRepository.deleteAll();
        doNothing().when(javaMailSender).send(any(SimpleMailMessage.class));

        owner = userRepository.save(new User(null, "Ayşe", "Demir", "ayse@example.com", passwordEncoder.encode("old-secret")));
        otherUser = userRepository.save(new User(null, "Mehmet", "Kaya", "mehmet@example.com", passwordEncoder.encode("other-secret")));
    }

    @Test
    void deleteProfileWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(delete("/api/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void authenticatedUserCanDeleteOwnAccountAndReceivesNoContent() throws Exception {
        mockMvc.perform(delete("/api/profile")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isNoContent());

        assertThat(userRepository.findById(owner.getId())).isEmpty();
    }

    @Test
    void clientUserIdCannotDeleteAnotherUser() throws Exception {
        mockMvc.perform(delete("/api/profile?userId=" + otherUser.getId())
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isNoContent());

        assertThat(userRepository.findById(owner.getId())).isEmpty();
        assertThat(userRepository.findById(otherUser.getId())).isPresent();
    }

    @Test
    void userNotificationsAreDeleted() throws Exception {
        Notification ownNotification = createNotification(owner);
        Notification otherNotification = createNotification(otherUser);

        deleteOwner();

        assertThat(notificationRepository.findById(ownNotification.getId())).isEmpty();
        assertThat(notificationRepository.findById(otherNotification.getId())).isPresent();
    }

    @Test
    void passwordResetRequestsAreDeletedByEmail() throws Exception {
        createPasswordResetRequest(owner.getEmail());
        createPasswordResetRequest(otherUser.getEmail());

        deleteOwner();

        assertThat(passwordResetRequestRepository.findByEmail(owner.getEmail())).isEmpty();
        assertThat(passwordResetRequestRepository.findByEmail(otherUser.getEmail())).isPresent();
    }

    @Test
    void pendingRegistrationsAreDeletedByEmail() throws Exception {
        createPendingRegistration(owner.getEmail());
        createPendingRegistration("pending-other@example.com");

        deleteOwner();

        assertThat(pendingRegistrationRepository.findByEmail(owner.getEmail())).isEmpty();
        assertThat(pendingRegistrationRepository.findByEmail("pending-other@example.com")).isPresent();
    }

    @Test
    void memberMembershipsAreDeleted() throws Exception {
        Team team = createTeam("Member team");
        TeamMember membership = createMembership(team, owner, TeamRole.MEMBER, 1);

        deleteOwner();

        assertThat(teamMemberRepository.findById(membership.getId())).isEmpty();
        assertThat(teamRepository.findById(team.getId())).isPresent();
    }

    @Test
    void adminMembershipsAreDeleted() throws Exception {
        Team team = createTeam("Admin team");
        TeamMember membership = createMembership(team, owner, TeamRole.ADMIN, 1);

        deleteOwner();

        assertThat(teamMemberRepository.findById(membership.getId())).isEmpty();
        assertThat(teamRepository.findById(team.getId())).isPresent();
    }

    @Test
    void adminBecomesOwnerWhenOwnerDeletesAccount() throws Exception {
        Team team = createTeam("Admin promotion");
        User admin = userRepository.save(new User(null, "Admin", "User", "admin@example.com", passwordEncoder.encode("secret")));
        User member = userRepository.save(new User(null, "Member", "User", "member@example.com", passwordEncoder.encode("secret")));
        createMembership(team, owner, TeamRole.OWNER, 1);
        TeamMember adminMembership = createMembership(team, admin, TeamRole.ADMIN, 2);
        createMembership(team, member, TeamRole.MEMBER, 0);
        Project teamProject = createProject("Team Project", owner, team);

        deleteOwner();

        TeamMember updatedAdminMembership = teamMemberRepository.findById(adminMembership.getId()).orElseThrow();
        Project updatedProject = projectRepository.findById(teamProject.getId()).orElseThrow();
        assertThat(updatedAdminMembership.getRole()).isEqualTo(TeamRole.OWNER.name());
        assertThat(updatedProject.getUser().getId()).isEqualTo(admin.getId());
    }

    @Test
    void memberBecomesOwnerWhenOwnerDeletesAccountAndNoAdminExists() throws Exception {
        Team team = createTeam("Member promotion");
        User member = userRepository.save(new User(null, "Member", "User", "member@example.com", passwordEncoder.encode("secret")));
        createMembership(team, owner, TeamRole.OWNER, 1);
        TeamMember memberMembership = createMembership(team, member, TeamRole.MEMBER, 2);

        deleteOwner();

        TeamMember updatedMemberMembership = teamMemberRepository.findById(memberMembership.getId()).orElseThrow();
        assertThat(updatedMemberMembership.getRole()).isEqualTo(TeamRole.OWNER.name());
    }

    @Test
    void emptyOwnedTeamWithoutProjectsIsDeleted() throws Exception {
        Team team = createTeam("Empty team");
        createMembership(team, owner, TeamRole.OWNER, 1);

        deleteOwner();

        assertThat(teamRepository.findById(team.getId())).isEmpty();
    }

    @Test
    void soloOwnedTeamWithProjectBlocksDeletionAndRollsBack() throws Exception {
        Team team = createTeam("Blocked team");
        TeamMember ownerMembership = createMembership(team, owner, TeamRole.OWNER, 1);
        Project teamProject = createProject("Team Project", owner, team);
        Notification notification = createNotification(owner);

        mockMvc.perform(delete("/api/profile")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Sahibi olduğunuz ve projelere bağlı takımlar bulunduğu için hesabınız silinemiyor. Önce takım projelerini silin veya takım sahipliğini başka bir üyeye devredin."));

        assertThat(userRepository.findById(owner.getId())).isPresent();
        assertThat(teamMemberRepository.findById(ownerMembership.getId())).isPresent();
        assertThat(projectRepository.findById(teamProject.getId())).isPresent();
        assertThat(notificationRepository.findById(notification.getId())).isPresent();
    }

    @Test
    void personalProjectsAndTasksAreDeleted() throws Exception {
        Project project = createProject("Personal", owner, null);
        Task task = createTask(project);

        deleteOwner();

        assertThat(taskRepository.findById(task.getId())).isEmpty();
        assertThat(projectRepository.findById(project.getId())).isEmpty();
    }

    @Test
    void otherUsersPersonalProjectsAreNotAffected() throws Exception {
        Project otherProject = createProject("Other Personal", otherUser, null);
        Task otherTask = createTask(otherProject);

        deleteOwner();

        assertThat(projectRepository.findById(otherProject.getId())).isPresent();
        assertThat(taskRepository.findById(otherTask.getId())).isPresent();
    }

    @Test
    void teamProjectsAreNotDeletedWhenCreatorAccountIsDeleted() throws Exception {
        Team team = createTeam("Team project kept");
        createMembership(team, otherUser, TeamRole.OWNER, 1);
        createMembership(team, owner, TeamRole.MEMBER, 2);
        Project teamProject = createProject("Team Project", owner, team);
        Task task = createTask(teamProject);

        deleteOwner();

        Project updatedProject = projectRepository.findById(teamProject.getId()).orElseThrow();
        assertThat(updatedProject.getTeam().getId()).isEqualTo(team.getId());
        assertThat(updatedProject.getUser().getId()).isEqualTo(otherUser.getId());
        assertThat(taskRepository.findById(task.getId())).isPresent();
    }

    @Test
    void deletedUserCannotLoginWithOldCredentials() throws Exception {
        deleteOwner();

        mockMvc.perform(post("/api/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "ayse@example.com",
                                  "password": "old-secret"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Email veya şifre hatalı"));
    }

    private void deleteOwner() throws Exception {
        mockMvc.perform(delete("/api/profile")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isNoContent());
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    private Team createTeam(String name) {
        Team team = new Team();
        team.setName(name);
        team.setDescription("");
        team.setCreatedDate(LocalDateTime.now());
        return teamRepository.save(team);
    }

    private TeamMember createMembership(Team team, User user, TeamRole role, int joinedOffsetDays) {
        TeamMember membership = new TeamMember();
        membership.setTeam(team);
        membership.setUser(user);
        membership.setRole(role.name());
        membership.setJoinedDate(LocalDateTime.now().plusDays(joinedOffsetDays));
        return teamMemberRepository.save(membership);
    }

    private Project createProject(String name, User user, Team team) {
        Project project = new Project();
        project.setProjectName(name);
        project.setDescription("");
        project.setUser(user);
        project.setTeam(team);
        return projectRepository.save(project);
    }

    private Task createTask(Project project) {
        Task task = new Task();
        task.setTitle("Task");
        task.setDescription("");
        task.setStatus("YAPILACAK");
        task.setProject(project);
        return taskRepository.save(task);
    }

    private Notification createNotification(User recipient) {
        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setTitle("Title");
        notification.setMessage("Message");
        notification.setType(NotificationType.TEAM_PROJECT_CREATED);
        return notificationRepository.save(notification);
    }

    private void createPasswordResetRequest(String email) {
        PasswordResetRequest request = new PasswordResetRequest();
        request.setEmail(email);
        request.setVerificationCodeHash("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
        request.setExpiresAt(Instant.now().plusSeconds(600));
        request.setResendAvailableAt(Instant.now().plusSeconds(60));
        passwordResetRequestRepository.save(request);
    }

    private void createPendingRegistration(String email) {
        PendingRegistration registration = new PendingRegistration();
        registration.setFirstName("Pending");
        registration.setLastName("User");
        registration.setEmail(email);
        registration.setEncodedPassword("encoded");
        registration.setVerificationCodeHash("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
        registration.setExpiresAt(Instant.now().plusSeconds(600));
        registration.setResendAvailableAt(Instant.now().plusSeconds(60));
        pendingRegistrationRepository.save(registration);
    }
}

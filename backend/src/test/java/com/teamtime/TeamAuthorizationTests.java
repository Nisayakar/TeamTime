package com.teamtime;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.TeamRole;
import com.teamtime.entity.User;
import com.teamtime.repository.TeamMemberRepository;
import com.teamtime.repository.TeamRepository;
import com.teamtime.repository.UserRepository;
import com.teamtime.repository.NotificationRepository;
import com.teamtime.security.JwtService;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:team-authorization;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "verification.code.secret=test-secret",
        "spring.mail.username=noreply@teamtime.test"
})
class TeamAuthorizationTests {

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
    private NotificationRepository notificationRepository;

    private User owner;
    private User admin;
    private User member;
    private User outsider;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        teamMemberRepository.deleteAll();
        teamRepository.deleteAll();
        userRepository.deleteAll();

        owner = userRepository.save(new User(null, "Owner", "User", "owner@example.com", "password"));
        admin = userRepository.save(new User(null, "Admin", "User", "admin@example.com", "password"));
        member = userRepository.save(new User(null, "Member", "User", "member@example.com", "password"));
        outsider = userRepository.save(new User(null, "Outsider", "User", "outsider@example.com", "password"));
    }

    @Test
    void teamCreatorBecomesOwner() throws Exception {
        Long teamId = createTeam(owner, "Core Team");

        TeamMember ownerMembership = teamMemberRepository.findByTeamIdAndUserId(teamId, owner.getId()).orElseThrow();

        org.assertj.core.api.Assertions.assertThat(ownerMembership.getRole()).isEqualTo(TeamRole.OWNER.name());
    }

    @Test
    void userSeesOnlyTheirTeams() throws Exception {
        Long ownerTeamId = createTeam(owner, "Owner Team");
        createTeam(outsider, "Outsider Team");

        mockMvc.perform(get("/api/teams")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(ownerTeamId));
    }

    @Test
    void dashboardCountsDistinctTeamsForAuthenticatedUser() throws Exception {
        createTeam(owner, "Owner Team");
        Long sharedTeamId = createTeam(outsider, "Shared Team");
        createTeam(outsider, "Outsider Team");
        addMember(outsider, sharedTeamId, owner.getId(), TeamRole.MEMBER);

        mockMvc.perform(get("/api/dashboard")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teamCount").value(2));
    }

    @Test
    void nonMemberCannotViewTeamMembers() throws Exception {
        Long teamId = createTeam(owner, "Private Team");

        mockMvc.perform(get("/api/teams/{teamId}/members", teamId)
                        .header(AUTHORIZATION, bearer(outsider)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void teamMemberResponseIncludesEmailOnlyForTeamMembers() throws Exception {
        Long teamId = createTeam(owner, "Visible Email Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);

        mockMvc.perform(get("/api/teams/{teamId}/members", teamId)
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userName").value("Owner User"))
                .andExpect(jsonPath("$[0].userEmail").value("owner@example.com"))
                .andExpect(jsonPath("$[1].userName").value("Member User"))
                .andExpect(jsonPath("$[1].userEmail").value("member@example.com"));

        mockMvc.perform(get("/api/teams/{teamId}/members", teamId)
                        .header(AUTHORIZATION, bearer(outsider)))
                .andExpect(status().isForbidden());
    }

    @Test
    void memberCannotUpdateOrDeleteTeam() throws Exception {
        Long teamId = createTeam(owner, "Managed Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);

        mockMvc.perform(put("/api/teams/{teamId}", teamId)
                        .header(AUTHORIZATION, bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Updated",
                                  "description": "Nope"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/teams/{teamId}", teamId)
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanAddMember() throws Exception {
        Long teamId = createTeam(owner, "Admin Managed Team");
        addMember(owner, teamId, admin.getId(), TeamRole.ADMIN);

        mockMvc.perform(post("/api/teams/{teamId}/members", teamId)
                        .header(AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addMemberJson(member.getId(), TeamRole.MEMBER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value(TeamRole.MEMBER.name()));
    }

    @Test
    void onlyOwnerCanTransferOwnershipToExistingMember() throws Exception {
        Long teamId = createTeam(owner, "Transfer Team");
        addMember(owner, teamId, admin.getId(), TeamRole.ADMIN);
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);

        mockMvc.perform(put("/api/teams/{teamId}/members/{userId}/owner", teamId, member.getId())
                        .header(AUTHORIZATION, bearer(admin)))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/teams/{teamId}/members/{userId}/owner", teamId, admin.getId())
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/teams/{teamId}/members/{userId}/owner", teamId, outsider.getId())
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/teams/{teamId}/members/{userId}/owner", teamId, owner.getId())
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isConflict());

        mockMvc.perform(put("/api/teams/{teamId}/members/{userId}/owner", teamId, member.getId())
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)));

        TeamMember previousOwner = teamMemberRepository.findByTeamIdAndUserId(teamId, owner.getId()).orElseThrow();
        TeamMember newOwner = teamMemberRepository.findByTeamIdAndUserId(teamId, member.getId()).orElseThrow();

        org.assertj.core.api.Assertions.assertThat(previousOwner.getRole()).isEqualTo(TeamRole.ADMIN.name());
        org.assertj.core.api.Assertions.assertThat(newOwner.getRole()).isEqualTo(TeamRole.OWNER.name());
        org.assertj.core.api.Assertions.assertThat(ownerCount(teamId)).isEqualTo(1);
    }

    @Test
    void membersAndAdminsCanLeaveButOwnerMustTransferFirst() throws Exception {
        Long memberLeaveTeamId = createTeam(owner, "Member Leave Team");
        addMember(owner, memberLeaveTeamId, member.getId(), TeamRole.MEMBER);

        mockMvc.perform(delete("/api/teams/{teamId}/members/me", memberLeaveTeamId)
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isNoContent());

        org.assertj.core.api.Assertions
                .assertThat(teamMemberRepository.findByTeamIdAndUserId(memberLeaveTeamId, member.getId()))
                .isEmpty();

        Long adminLeaveTeamId = createTeam(owner, "Admin Leave Team");
        addMember(owner, adminLeaveTeamId, admin.getId(), TeamRole.ADMIN);

        mockMvc.perform(delete("/api/teams/{teamId}/members/me", adminLeaveTeamId)
                        .header(AUTHORIZATION, bearer(admin)))
                .andExpect(status().isNoContent());

        org.assertj.core.api.Assertions
                .assertThat(teamMemberRepository.findByTeamIdAndUserId(adminLeaveTeamId, admin.getId()))
                .isEmpty();

        Long ownerLeaveTeamId = createTeam(owner, "Owner Leave Team");
        addMember(owner, ownerLeaveTeamId, member.getId(), TeamRole.MEMBER);

        mockMvc.perform(delete("/api/teams/{teamId}/members/me", ownerLeaveTeamId)
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Takımdan çıkmadan önce takım sahipliğini başka bir üyeye devretmelisiniz."));

        mockMvc.perform(put("/api/teams/{teamId}/members/{userId}/owner", ownerLeaveTeamId, member.getId())
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/teams/{teamId}/members/me", ownerLeaveTeamId)
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isNoContent());

        org.assertj.core.api.Assertions
                .assertThat(teamMemberRepository.findByTeamIdAndUserId(ownerLeaveTeamId, owner.getId()))
                .isEmpty();
        org.assertj.core.api.Assertions.assertThat(ownerCount(ownerLeaveTeamId)).isEqualTo(1);
    }

    @Test
    void leaveEndpointDoesNotAcceptAnotherUserId() throws Exception {
        Long teamId = createTeam(owner, "Leave Safety Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);

        mockMvc.perform(delete("/api/teams/{teamId}/members/{userId}", teamId, owner.getId())
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isForbidden());

        org.assertj.core.api.Assertions
                .assertThat(teamMemberRepository.findByTeamIdAndUserId(teamId, owner.getId()))
                .isPresent();
    }

    @Test
    void adminCannotRemoveOwner() throws Exception {
        Long teamId = createTeam(owner, "Protected Owner Team");
        addMember(owner, teamId, admin.getId(), TeamRole.ADMIN);

        mockMvc.perform(delete("/api/teams/{teamId}/members/{userId}", teamId, owner.getId())
                        .header(AUTHORIZATION, bearer(admin)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void onlyOwnerCanDeleteTeam() throws Exception {
        Long teamId = createTeam(owner, "Owner Delete Team");
        addMember(owner, teamId, admin.getId(), TeamRole.ADMIN);

        mockMvc.perform(delete("/api/teams/{teamId}", teamId)
                        .header(AUTHORIZATION, bearer(admin)))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/teams/{teamId}", teamId)
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isNoContent());
    }

    @Test
    void duplicateMemberReturnsConflict() throws Exception {
        Long teamId = createTeam(owner, "Duplicate Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);

        mockMvc.perform(post("/api/teams/{teamId}/members", teamId)
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addMemberJson(member.getId(), TeamRole.MEMBER)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void arbitraryUserTeamsAccessIsBlocked() throws Exception {
        createTeam(outsider, "Outsider Team");

        mockMvc.perform(get("/api/users/{userId}/teams", outsider.getId())
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void ownerCanPromoteMemberToAdmin() throws Exception {
        Long teamId = createTeam(owner, "Promotion Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);

        mockMvc.perform(put("/api/teams/{teamId}/members/{userId}/admin", teamId, member.getId())
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk());

        org.assertj.core.api.Assertions.assertThat(
            teamMemberRepository.findByTeamIdAndUserId(teamId, member.getId()).get().getRole()
        ).isEqualTo("ADMIN");
    }

    @Test
    void memberCannotPromoteOrTransferOwnership() throws Exception {
        Long teamId = createTeam(owner, "Mischief Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);
        addMember(owner, teamId, outsider.getId(), TeamRole.MEMBER);

        mockMvc.perform(put("/api/teams/{teamId}/members/{userId}/admin", teamId, outsider.getId())
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/teams/{teamId}/members/{userId}/owner", teamId, outsider.getId())
                        .header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isForbidden());
    }

    @Test
    void ownerCanTransferOwnershipAndBecomesAdmin() throws Exception {
        Long teamId = createTeam(owner, "Transfer Team");
        addMember(owner, teamId, member.getId(), TeamRole.MEMBER);

        mockMvc.perform(put("/api/teams/{teamId}/members/{userId}/owner", teamId, member.getId())
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk());

        org.assertj.core.api.Assertions.assertThat(ownerCount(teamId)).isEqualTo(1);
        org.assertj.core.api.Assertions.assertThat(
            teamMemberRepository.findByTeamIdAndUserId(teamId, member.getId()).get().getRole()
        ).isEqualTo("OWNER");
        org.assertj.core.api.Assertions.assertThat(
            teamMemberRepository.findByTeamIdAndUserId(teamId, owner.getId()).get().getRole()
        ).isEqualTo("ADMIN");
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
                        .content(addMemberJson(userId, role)))
                .andExpect(status().isOk());
    }

    private String addMemberJson(Long userId, TeamRole role) {
        return """
                {
                  "userId": %d,
                  "role": "%s"
                }
                """.formatted(userId, role.name());
    }

    private long ownerCount(Long teamId) {
        return teamMemberRepository.findByTeamId(teamId)
                .stream()
                .filter(teamMember -> TeamRole.from(teamMember.getRole()) == TeamRole.OWNER)
                .count();
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }
}

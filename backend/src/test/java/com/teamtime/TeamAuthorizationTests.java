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

    private User owner;
    private User admin;
    private User member;
    private User outsider;

    @BeforeEach
    void setUp() {
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
    void nonMemberCannotViewTeamMembers() throws Exception {
        Long teamId = createTeam(owner, "Private Team");

        mockMvc.perform(get("/api/teams/{teamId}/members", teamId)
                        .header(AUTHORIZATION, bearer(outsider)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
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

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }
}

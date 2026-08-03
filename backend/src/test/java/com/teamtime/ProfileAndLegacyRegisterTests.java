package com.teamtime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.teamtime.entity.User;
import com.teamtime.repository.PendingRegistrationRepository;
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

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:profile-and-legacy-register;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "verification.code.secret=test-secret",
        "spring.mail.username=noreply@teamtime.test"
})
class ProfileAndLegacyRegisterTests {

    private static final String AUTHORIZATION = "Authorization";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

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
        pendingRegistrationRepository.deleteAll();
        userRepository.deleteAll();
        when(verificationCodeGenerator.generateSixDigitCode()).thenReturn("123456");
        doNothing().when(javaMailSender).send(any(SimpleMailMessage.class));

        owner = userRepository.save(new User(null, "Ayşe", "Demir", "ayse@example.com", passwordEncoder.encode("old-secret")));
        otherUser = userRepository.save(new User(null, "Mehmet", "Kaya", "mehmet@example.com", passwordEncoder.encode("other-secret")));
    }

    @Test
    void authenticatedUserCanLoadOwnProfile() throws Exception {
        mockMvc.perform(get("/api/profile")
                        .header(AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(owner.getId()))
                .andExpect(jsonPath("$.name").value("Ayşe"))
                .andExpect(jsonPath("$.surname").value("Demir"))
                .andExpect(jsonPath("$.email").value("ayse@example.com"));
    }

    @Test
    void profileUpdateValidationReturnsBadRequest() throws Exception {
        mockMvc.perform(put("/api/profile")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "",
                                  "surname": "Demir",
                                  "email": "not-email"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    @Test
    void duplicateProfileEmailReturnsConflict() throws Exception {
        mockMvc.perform(put("/api/profile")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Ayşe",
                                  "surname": "Demir",
                                  "email": "mehmet@example.com"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Bu email adresi ile kayıtlı bir kullanıcı zaten var"));
    }

    @Test
    void correctOldPasswordIsRequiredForPasswordChange() throws Exception {
        mockMvc.perform(put("/api/profile/password")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "oldPassword": "wrong-secret",
                                  "newPassword": "new-secret"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Eski şifre hatalı"));
    }

    @Test
    void newPasswordIsBCryptEncoded() throws Exception {
        mockMvc.perform(put("/api/profile/password")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "oldPassword": "old-secret",
                                  "newPassword": "new-secret"
                                }
                                """))
                .andExpect(status().isOk());

        User updatedUser = userRepository.findById(owner.getId()).orElseThrow();

        org.assertj.core.api.Assertions.assertThat(updatedUser.getPassword()).isNotEqualTo("new-secret");
        org.assertj.core.api.Assertions.assertThat(passwordEncoder.matches("new-secret", updatedUser.getPassword())).isTrue();
    }

    @Test
    void unauthenticatedProfileAccessIsRejected() throws Exception {
        mockMvc.perform(get("/api/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void profileUpdateCannotModifyAnotherUser() throws Exception {
        mockMvc.perform(put("/api/profile")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "id": %d,
                                  "name": "Owner Updated",
                                  "surname": "Updated",
                                  "email": "owner-updated@example.com"
                                }
                                """.formatted(otherUser.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(owner.getId()));

        User unchangedOtherUser = userRepository.findById(otherUser.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(unchangedOtherUser.getEmail()).isEqualTo("mehmet@example.com");
    }

    @Test
    void legacyRegisterEndpointCreatesPendingRegistrationButDoesNotCreateUser() throws Exception {
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Legacy",
                                  "surname": "User",
                                  "email": "legacy@example.com",
                                  "password": "secret123"
                                }
                """))
                .andExpect(status().isOk())
                .andExpect(content().string("Doğrulama kodu e-posta adresinize gönderildi"));

        org.assertj.core.api.Assertions.assertThat(userRepository.existsByEmailIgnoreCase("legacy@example.com")).isFalse();
        org.assertj.core.api.Assertions.assertThat(pendingRegistrationRepository.findByEmail("legacy@example.com")).isPresent();
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }
}

package com.teamtime;

import static org.mockito.ArgumentMatchers.any;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.teamtime.entity.User;
import com.teamtime.entity.EmailChangeRequest;
import com.teamtime.repository.EmailChangeRequestRepository;
import com.teamtime.repository.PendingRegistrationRepository;
import com.teamtime.repository.UserRepository;
import com.teamtime.security.JwtService;
import com.teamtime.service.VerificationCodeGenerator;
import com.teamtime.service.VerificationCodeHashService;

import java.time.Instant;
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
    private EmailChangeRequestRepository emailChangeRequestRepository;

    @Autowired
    private VerificationCodeHashService verificationCodeHashService;

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
        emailChangeRequestRepository.deleteAll();
        pendingRegistrationRepository.deleteAll();
        userRepository.deleteAll();
        reset(verificationCodeGenerator, javaMailSender);
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
    void profileUpdateCannotChangeEmailDirectly() throws Exception {
        mockMvc.perform(put("/api/profile")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Ayşe",
                                  "surname": "Demir",
                                  "email": "owner-updated@example.com"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("E-posta adresi doğrulama kodu ile değiştirilmelidir"));

        User unchangedOwner = userRepository.findById(owner.getId()).orElseThrow();
        assertThat(unchangedOwner.getEmail()).isEqualTo("ayse@example.com");
    }

    @Test
    void profileUpdateStillUpdatesNameAndSurname() throws Exception {
        mockMvc.perform(put("/api/profile")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Ayşe Nur",
                                  "surname": "Yılmaz"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Ayşe Nur"))
                .andExpect(jsonPath("$.surname").value("Yılmaz"))
                .andExpect(jsonPath("$.email").value("ayse@example.com"));
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
                .andExpect(status().isBadRequest());

        User unchangedOtherUser = userRepository.findById(otherUser.getId()).orElseThrow();
        assertThat(unchangedOtherUser.getEmail()).isEqualTo("mehmet@example.com");
        User unchangedOwner = userRepository.findById(owner.getId()).orElseThrow();
        assertThat(unchangedOwner.getEmail()).isEqualTo("ayse@example.com");
    }

    @Test
    void authenticatedUserCanRequestEmailChangeCode() throws Exception {
        mockMvc.perform(post("/api/profile/email/request-code")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "new@example.com"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().string("Doğrulama kodu yeni e-posta adresinize gönderildi"));

        EmailChangeRequest request = emailChangeRequestRepository
                .findByUserIdAndNewEmailIgnoreCase(owner.getId(), "new@example.com")
                .orElseThrow();

        assertThat(request.getVerificationCodeHash()).isNotEqualTo("123456");
        assertThat(verificationCodeHashService.matches("new@example.com", "123456", request.getVerificationCodeHash())).isTrue();
        assertThat(userRepository.findById(owner.getId()).orElseThrow().getEmail()).isEqualTo("ayse@example.com");
    }

    @Test
    void emailChangeInvalidSameAndDuplicateEmailsAreRejected() throws Exception {
        mockMvc.perform(post("/api/profile/email/request-code")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "not-email"
                                }
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/profile/email/request-code")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "AYSE@example.com"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Mevcut e-posta adresinizden farklı bir e-posta girin"));

        mockMvc.perform(post("/api/profile/email/request-code")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "mehmet@example.com"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Bu email adresi ile kayıtlı bir kullanıcı zaten var"));
    }

    @Test
    void successfulEmailChangeVerifyUpdatesUserAndDeletesPending() throws Exception {
        requestEmailChange("new@example.com");

        mockMvc.perform(post("/api/profile/email/verify")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "new@example.com",
                                  "code": "123456"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("new@example.com"));

        assertThat(userRepository.findById(owner.getId()).orElseThrow().getEmail()).isEqualTo("new@example.com");
        assertThat(emailChangeRequestRepository.findByUserIdAndNewEmailIgnoreCase(owner.getId(), "new@example.com")).isEmpty();
    }

    @Test
    void emailChangeSupportsLeadingZeroCode() throws Exception {
        when(verificationCodeGenerator.generateSixDigitCode()).thenReturn("004271");
        requestEmailChange("zero@example.com");

        mockMvc.perform(post("/api/profile/email/verify")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "zero@example.com",
                                  "code": "004271"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("zero@example.com"));
    }

    @Test
    void wrongEmailChangeCodeIncrementsAttemptsAndBlocksAfterFiveFailures() throws Exception {
        requestEmailChange("new@example.com");

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/profile/email/verify")
                            .header(AUTHORIZATION, bearer(owner))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "email": "new@example.com",
                                      "code": "000000"
                                    }
                                    """))
                    .andExpect(status().isBadRequest());
        }

        EmailChangeRequest request = emailChangeRequestRepository
                .findByUserIdAndNewEmailIgnoreCase(owner.getId(), "new@example.com")
                .orElseThrow();
        assertThat(request.getFailedAttempts()).isEqualTo(5);

        mockMvc.perform(post("/api/profile/email/verify")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "new@example.com",
                                  "code": "123456"
                                }
                                """))
                .andExpect(status().isTooManyRequests());

        assertThat(userRepository.findById(owner.getId()).orElseThrow().getEmail()).isEqualTo("ayse@example.com");
    }

    @Test
    void expiredEmailChangeCodeIsRejected() throws Exception {
        requestEmailChange("new@example.com");
        EmailChangeRequest request = emailChangeRequestRepository
                .findByUserIdAndNewEmailIgnoreCase(owner.getId(), "new@example.com")
                .orElseThrow();
        request.setExpiresAt(Instant.now().minusSeconds(1));
        emailChangeRequestRepository.save(request);

        mockMvc.perform(post("/api/profile/email/verify")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "new@example.com",
                                  "code": "123456"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Doğrulama kodunun süresi doldu"));

        assertThat(userRepository.findById(owner.getId()).orElseThrow().getEmail()).isEqualTo("ayse@example.com");
    }

    @Test
    void emailChangeResendCooldownAndInvalidationAreEnforced() throws Exception {
        when(verificationCodeGenerator.generateSixDigitCode()).thenReturn("111111", "222222");
        requestEmailChange("new@example.com");

        mockMvc.perform(post("/api/profile/email/resend-code")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "new@example.com"
                                }
                                """))
                .andExpect(status().isTooManyRequests());

        EmailChangeRequest request = emailChangeRequestRepository
                .findByUserIdAndNewEmailIgnoreCase(owner.getId(), "new@example.com")
                .orElseThrow();
        request.setResendAvailableAt(Instant.now().minusSeconds(1));
        emailChangeRequestRepository.save(request);

        mockMvc.perform(post("/api/profile/email/resend-code")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "new@example.com"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/profile/email/verify")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "new@example.com",
                                  "code": "111111"
                                }
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/profile/email/verify")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "new@example.com",
                                  "code": "222222"
                                }
                                """))
                .andExpect(status().isOk());
    }

    @Test
    void otherUserCannotVerifyEmailChangeRequest() throws Exception {
        requestEmailChange("new@example.com");

        mockMvc.perform(post("/api/profile/email/verify")
                        .header(AUTHORIZATION, bearer(otherUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "new@example.com",
                                  "code": "123456"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Doğrulama kodu geçersiz"));

        assertThat(userRepository.findById(owner.getId()).orElseThrow().getEmail()).isEqualTo("ayse@example.com");
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

        assertThat(userRepository.existsByEmailIgnoreCase("legacy@example.com")).isFalse();
        assertThat(pendingRegistrationRepository.findByEmail("legacy@example.com")).isPresent();
    }

    private void requestEmailChange(String email) throws Exception {
        mockMvc.perform(post("/api/profile/email/request-code")
                        .header(AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s"
                                }
                                """.formatted(email)))
                .andExpect(status().isOk());
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }
}

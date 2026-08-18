package com.teamtime;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.teamtime.entity.User;
import com.teamtime.exception.ResourceNotFoundException;
import com.teamtime.repository.PendingRegistrationRepository;
import com.teamtime.repository.UserRepository;
import com.teamtime.service.VerificationCodeGenerator;

@SpringBootTest
@AutoConfigureMockMvc
@Import(GlobalExceptionHandlerTests.TestExceptionController.class)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:global-exception-handler;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "verification.code.secret=test-secret",
        "spring.mail.username=noreply@teamtime.test"
})
class GlobalExceptionHandlerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PendingRegistrationRepository pendingRegistrationRepository;

    @MockBean
    private VerificationCodeGenerator verificationCodeGenerator;

    @MockBean
    private JavaMailSender javaMailSender;

    @BeforeEach
    void setUp() {
        pendingRegistrationRepository.deleteAll();
        userRepository.deleteAll();
        doNothing().when(javaMailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void validationFailureReturnsFieldErrors() throws Exception {
        mockMvc.perform(post("/api/auth/register/request-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.path").value("/api/auth/register/request-code"))
                .andExpect(jsonPath("$.fieldErrors.firstName").value("Ad boş bırakılamaz"));
    }

    @Test
    void missingResourceReturnsNotFound() throws Exception {
        mockMvc.perform(get("/test/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Test resource not found"))
                .andExpect(jsonPath("$.path").value("/test/not-found"));
    }

    @Test
    void malformedJsonReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{bad-json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Request body is missing or malformed."))
                .andExpect(jsonPath("$.path").value("/api/login"));
    }

    @Test
    void duplicateEmailReturnsConflict() throws Exception {
        userRepository.save(new User(null, "Ayşe", "Demir", "ayse@example.com", "encoded-password"));

        mockMvc.perform(post("/api/auth/register/request-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Ayşe",
                                  "lastName": "Demir",
                                  "username": "aysedemir",
                                  "email": "ayse@example.com",
                                  "password": "secret123"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Bu email adresi ile kayıtlı bir kullanıcı zaten var"))
                .andExpect(jsonPath("$.path").value("/api/auth/register/request-code"));
    }

    @Test
    void unexpectedExceptionResponseDoesNotExposeStackTrace() throws Exception {
        mockMvc.perform(get("/test/unexpected"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.message").value("An unexpected server error occurred."))
                .andExpect(content().string(not(containsString("IllegalStateException"))))
                .andExpect(content().string(not(containsString("java.lang"))));
    }

    @Test
    void unauthenticatedProtectedRequestReturnsJsonUnauthorized() throws Exception {
        mockMvc.perform(get("/api/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.path").value("/api/profile"));
    }

    @Test
    void forbiddenExceptionReturnsJsonForbidden() throws Exception {
        mockMvc.perform(get("/test/forbidden"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Access denied."))
                .andExpect(jsonPath("$.path").value("/test/forbidden"));
    }

    @Test
    void optimisticLockExceptionReturnsConflict() throws Exception {
        mockMvc.perform(get("/test/optimistic-lock"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value("Görev başka bir kullanıcı tarafından güncellendi. Lütfen sayfayı yenileyip tekrar deneyin."))
                .andExpect(jsonPath("$.path").value("/test/optimistic-lock"));
    }

    @RestController
    static class TestExceptionController {

        @GetMapping("/test/not-found")
        void notFound() {
            throw new ResourceNotFoundException("Test resource not found");
        }

        @GetMapping("/test/unexpected")
        void unexpected() {
            throw new IllegalStateException("sensitive implementation detail");
        }

        @GetMapping("/test/forbidden")
        void forbidden() {
            throw new AccessDeniedException("forbidden test detail");
        }

        @GetMapping("/test/optimistic-lock")
        void optimisticLock() {
            throw new org.springframework.orm.ObjectOptimisticLockingFailureException(com.teamtime.entity.Task.class, 1L);
        }
    }
}

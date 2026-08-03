package com.teamtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

import com.teamtime.dto.LoginRequest;
import com.teamtime.dto.PasswordResetCodeRequest;
import com.teamtime.dto.ResetPasswordRequest;
import com.teamtime.dto.VerifyPasswordResetCodeRequest;
import com.teamtime.entity.PasswordResetRequest;
import com.teamtime.entity.User;
import com.teamtime.exception.ResendCooldownException;
import com.teamtime.exception.TooManyVerificationAttemptsException;
import com.teamtime.exception.VerificationCodeException;
import com.teamtime.repository.PasswordResetRequestRepository;
import com.teamtime.repository.UserRepository;
import com.teamtime.service.UserService;
import com.teamtime.service.VerificationCodeGenerator;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:password-reset;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "verification.code.secret=test-secret",
        "spring.mail.username=noreply@teamtime.test"
})
class PasswordResetTests {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetRequestRepository passwordResetRequestRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private VerificationCodeGenerator verificationCodeGenerator;

    @MockBean
    private JavaMailSender javaMailSender;

    @BeforeEach
    void setUp() {
        passwordResetRequestRepository.deleteAll();
        userRepository.deleteAll();
        reset(verificationCodeGenerator, javaMailSender);
        when(verificationCodeGenerator.generateSixDigitCode()).thenReturn("123456");
        doNothing().when(javaMailSender).send(any(SimpleMailMessage.class));
        userRepository.save(new User(null, "Ayşe", "Demir", "ayse@example.com", passwordEncoder.encode("oldsecret")));
    }

    @Test
    void existingEmailRequestCreatesResetRecord() {
        userService.requestPasswordResetCode(new PasswordResetCodeRequest("AYSE@example.com"));

        assertThat(passwordResetRequestRepository.count()).isEqualTo(1);
        PasswordResetRequest resetRequest = passwordResetRequestRepository.findByEmail("ayse@example.com").orElseThrow();
        assertThat(resetRequest.isVerified()).isFalse();
    }

    @Test
    void unknownEmailReturnsNeutralSuccessAndCreatesNoRecord() {
        String response = userService.requestPasswordResetCode(new PasswordResetCodeRequest("unknown@example.com"));

        assertThat(response).contains("Eğer bu e-posta adresiyle kayıtlı bir hesap varsa");
        assertThat(passwordResetRequestRepository.count()).isZero();
    }

    @Test
    void rawCodeIsNotStored() {
        userService.requestPasswordResetCode(new PasswordResetCodeRequest("ayse@example.com"));

        PasswordResetRequest resetRequest = passwordResetRequestRepository.findByEmail("ayse@example.com").orElseThrow();

        assertThat(resetRequest.getVerificationCodeHash()).isNotEqualTo("123456");
        assertThat(resetRequest.getVerificationCodeHash()).hasSize(64);
    }

    @Test
    void leadingZeroCodeIsSupported() {
        when(verificationCodeGenerator.generateSixDigitCode()).thenReturn("004271");
        userService.requestPasswordResetCode(new PasswordResetCodeRequest("ayse@example.com"));

        userService.verifyPasswordResetCode(new VerifyPasswordResetCodeRequest("ayse@example.com", "004271"));

        PasswordResetRequest resetRequest = passwordResetRequestRepository.findByEmail("ayse@example.com").orElseThrow();
        assertThat(resetRequest.isVerified()).isTrue();
    }

    @Test
    void invalidCodeIncrementsAttempts() {
        userService.requestPasswordResetCode(new PasswordResetCodeRequest("ayse@example.com"));

        assertThatThrownBy(() -> userService.verifyPasswordResetCode(new VerifyPasswordResetCodeRequest("ayse@example.com", "000000")))
                .isInstanceOf(VerificationCodeException.class);

        PasswordResetRequest resetRequest = passwordResetRequestRepository.findByEmail("ayse@example.com").orElseThrow();
        assertThat(resetRequest.getFailedAttempts()).isEqualTo(1);
    }

    @Test
    void fifthFailedAttemptBlocksVerification() {
        userService.requestPasswordResetCode(new PasswordResetCodeRequest("ayse@example.com"));

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> userService.verifyPasswordResetCode(new VerifyPasswordResetCodeRequest("ayse@example.com", "000000")))
                    .isInstanceOf(VerificationCodeException.class);
        }

        assertThatThrownBy(() -> userService.verifyPasswordResetCode(new VerifyPasswordResetCodeRequest("ayse@example.com", "123456")))
                .isInstanceOf(TooManyVerificationAttemptsException.class);
    }

    @Test
    void expiredCodeIsRejected() {
        userService.requestPasswordResetCode(new PasswordResetCodeRequest("ayse@example.com"));
        PasswordResetRequest resetRequest = passwordResetRequestRepository.findByEmail("ayse@example.com").orElseThrow();
        resetRequest.setExpiresAt(Instant.now().minusSeconds(1));
        passwordResetRequestRepository.save(resetRequest);

        assertThatThrownBy(() -> userService.verifyPasswordResetCode(new VerifyPasswordResetCodeRequest("ayse@example.com", "123456")))
                .isInstanceOf(VerificationCodeException.class)
                .hasMessageContaining("süresi doldu");
    }

    @Test
    void resendCooldownIsEnforced() {
        userService.requestPasswordResetCode(new PasswordResetCodeRequest("ayse@example.com"));

        assertThatThrownBy(() -> userService.resendPasswordResetCode(new PasswordResetCodeRequest("ayse@example.com")))
                .isInstanceOf(ResendCooldownException.class);
    }

    @Test
    void resendInvalidatesOldCode() {
        when(verificationCodeGenerator.generateSixDigitCode()).thenReturn("111111", "222222");
        userService.requestPasswordResetCode(new PasswordResetCodeRequest("ayse@example.com"));
        makeResendAvailable();

        userService.resendPasswordResetCode(new PasswordResetCodeRequest("ayse@example.com"));

        assertThatThrownBy(() -> userService.verifyPasswordResetCode(new VerifyPasswordResetCodeRequest("ayse@example.com", "111111")))
                .isInstanceOf(VerificationCodeException.class);
        userService.verifyPasswordResetCode(new VerifyPasswordResetCodeRequest("ayse@example.com", "222222"));
        assertThat(passwordResetRequestRepository.findByEmail("ayse@example.com").orElseThrow().isVerified()).isTrue();
    }

    @Test
    void verifiedRequestResetsPasswordWithBCrypt() {
        userService.requestPasswordResetCode(new PasswordResetCodeRequest("ayse@example.com"));
        userService.verifyPasswordResetCode(new VerifyPasswordResetCodeRequest("ayse@example.com", "123456"));

        userService.resetPassword(new ResetPasswordRequest("ayse@example.com", "newsecret", "newsecret"));

        User user = userRepository.findByEmailIgnoreCase("ayse@example.com").orElseThrow();
        assertThat(user.getPassword()).isNotEqualTo("newsecret");
        assertThat(passwordEncoder.matches("newsecret", user.getPassword())).isTrue();
    }

    @Test
    void resetWithoutVerificationIsRejected() {
        userService.requestPasswordResetCode(new PasswordResetCodeRequest("ayse@example.com"));

        assertThatThrownBy(() -> userService.resetPassword(new ResetPasswordRequest("ayse@example.com", "newsecret", "newsecret")))
                .isInstanceOf(VerificationCodeException.class);
    }

    @Test
    void resetRecordIsRemovedAfterSuccess() {
        userService.requestPasswordResetCode(new PasswordResetCodeRequest("ayse@example.com"));
        userService.verifyPasswordResetCode(new VerifyPasswordResetCodeRequest("ayse@example.com", "123456"));

        userService.resetPassword(new ResetPasswordRequest("ayse@example.com", "newsecret", "newsecret"));

        assertThat(passwordResetRequestRepository.count()).isZero();
    }

    @Test
    void loginWorksWithNewPasswordAndFailsWithOldPassword() {
        userService.requestPasswordResetCode(new PasswordResetCodeRequest("ayse@example.com"));
        userService.verifyPasswordResetCode(new VerifyPasswordResetCodeRequest("ayse@example.com", "123456"));
        userService.resetPassword(new ResetPasswordRequest("ayse@example.com", "newsecret", "newsecret"));

        assertThat(userService.login(new LoginRequest("ayse@example.com", "newsecret")).getToken()).isNotBlank();
        assertThatThrownBy(() -> userService.login(new LoginRequest("ayse@example.com", "oldsecret")))
                .hasMessageContaining("Email veya şifre hatalı");
    }

    private void makeResendAvailable() {
        PasswordResetRequest resetRequest = passwordResetRequestRepository.findByEmail("ayse@example.com").orElseThrow();
        resetRequest.setResendAvailableAt(Instant.now().minusSeconds(1));
        passwordResetRequestRepository.save(resetRequest);
    }
}

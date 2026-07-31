package com.teamtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

import com.teamtime.dto.RegisterCodeRequest;
import com.teamtime.dto.ResendRegistrationCodeRequest;
import com.teamtime.dto.VerifyRegistrationRequest;
import com.teamtime.entity.PendingRegistration;
import com.teamtime.entity.User;
import com.teamtime.exception.DuplicateEmailException;
import com.teamtime.exception.EmailDeliveryException;
import com.teamtime.exception.ResendCooldownException;
import com.teamtime.exception.TooManyVerificationAttemptsException;
import com.teamtime.exception.VerificationCodeException;
import com.teamtime.repository.PendingRegistrationRepository;
import com.teamtime.repository.UserRepository;
import com.teamtime.service.UserService;
import com.teamtime.service.VerificationCodeGenerator;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:registration-verification;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "verification.code.secret=test-secret",
        "spring.mail.username=noreply@teamtime.test"
})
class RegistrationVerificationTests {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PendingRegistrationRepository pendingRegistrationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private VerificationCodeGenerator verificationCodeGenerator;

    @MockBean
    private JavaMailSender javaMailSender;

    @BeforeEach
    void setUp() {
        pendingRegistrationRepository.deleteAll();
        userRepository.deleteAll();
        reset(verificationCodeGenerator, javaMailSender);
        when(verificationCodeGenerator.generateSixDigitCode()).thenReturn("123456");
        doNothing().when(javaMailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void requestCodeDoesNotCreateUser() {
        userService.requestRegistrationCode(defaultRequest());

        assertThat(userRepository.count()).isZero();
        assertThat(pendingRegistrationRepository.count()).isEqualTo(1);
    }

    @Test
    void correctCodeCreatesExactlyOneUser() {
        userService.requestRegistrationCode(defaultRequest());

        userService.verifyRegistration(new VerifyRegistrationRequest("AYSE@example.com", "123456"));

        assertThat(userRepository.count()).isEqualTo(1);
        assertThat(pendingRegistrationRepository.count()).isZero();
    }

    @Test
    void wrongCodeDoesNotCreateUser() {
        userService.requestRegistrationCode(defaultRequest());

        assertThatThrownBy(() -> userService.verifyRegistration(new VerifyRegistrationRequest("ayse@example.com", "000000")))
                .isInstanceOf(VerificationCodeException.class);

        assertThat(userRepository.count()).isZero();
    }

    @Test
    void fiveWrongAttemptsBlockVerification() {
        userService.requestRegistrationCode(defaultRequest());

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> userService.verifyRegistration(new VerifyRegistrationRequest("ayse@example.com", "000000")))
                    .isInstanceOf(VerificationCodeException.class);
        }

        assertThatThrownBy(() -> userService.verifyRegistration(new VerifyRegistrationRequest("ayse@example.com", "123456")))
                .isInstanceOf(TooManyVerificationAttemptsException.class);
        assertThat(userRepository.count()).isZero();
    }

    @Test
    void expiredCodeIsRejected() {
        userService.requestRegistrationCode(defaultRequest());
        PendingRegistration pendingRegistration = pendingRegistrationRepository.findByEmail("ayse@example.com").orElseThrow();
        pendingRegistration.setExpiresAt(Instant.now().minusSeconds(1));
        pendingRegistrationRepository.save(pendingRegistration);

        assertThatThrownBy(() -> userService.verifyRegistration(new VerifyRegistrationRequest("ayse@example.com", "123456")))
                .isInstanceOf(VerificationCodeException.class)
                .hasMessageContaining("süresi doldu");
        assertThat(userRepository.count()).isZero();
    }

    @Test
    void resendInvalidatesOldCode() {
        when(verificationCodeGenerator.generateSixDigitCode()).thenReturn("111111", "222222");
        userService.requestRegistrationCode(defaultRequest());
        makeResendAvailable();

        userService.resendRegistrationCode(new ResendRegistrationCodeRequest("ayse@example.com"));

        assertThatThrownBy(() -> userService.verifyRegistration(new VerifyRegistrationRequest("ayse@example.com", "111111")))
                .isInstanceOf(VerificationCodeException.class);
        userService.verifyRegistration(new VerifyRegistrationRequest("ayse@example.com", "222222"));
        assertThat(userRepository.count()).isEqualTo(1);
    }

    @Test
    void resendCooldownIsEnforced() {
        userService.requestRegistrationCode(defaultRequest());

        assertThatThrownBy(() -> userService.resendRegistrationCode(new ResendRegistrationCodeRequest("ayse@example.com")))
                .isInstanceOf(ResendCooldownException.class);
    }

    @Test
    void alreadyRegisteredEmailIsRejected() {
        userRepository.save(new User(null, "Ayşe", "Demir", "ayse@example.com", "encoded-password"));

        assertThatThrownBy(() -> userService.requestRegistrationCode(defaultRequest()))
                .isInstanceOf(DuplicateEmailException.class);
    }

    @Test
    void successfulCodeCannotBeReused() {
        userService.requestRegistrationCode(defaultRequest());
        userService.verifyRegistration(new VerifyRegistrationRequest("ayse@example.com", "123456"));

        assertThatThrownBy(() -> userService.verifyRegistration(new VerifyRegistrationRequest("ayse@example.com", "123456")))
                .isInstanceOf(DuplicateEmailException.class);
    }

    @Test
    void pendingPasswordIsEncoded() {
        userService.requestRegistrationCode(defaultRequest());

        PendingRegistration pendingRegistration = pendingRegistrationRepository.findByEmail("ayse@example.com").orElseThrow();

        assertThat(pendingRegistration.getEncodedPassword()).isNotEqualTo("secret123");
        assertThat(passwordEncoder.matches("secret123", pendingRegistration.getEncodedPassword())).isTrue();
    }

    @Test
    void leadingZeroCodeIsSupported() {
        when(verificationCodeGenerator.generateSixDigitCode()).thenReturn("004271");
        userService.requestRegistrationCode(defaultRequest());

        userService.verifyRegistration(new VerifyRegistrationRequest("ayse@example.com", "004271"));

        assertThat(userRepository.count()).isEqualTo(1);
    }

    @Test
    void emailFailureDoesNotReturnSuccessOrPersistPendingRegistration() {
        doThrow(new MailSendException("SMTP unavailable"))
                .when(javaMailSender)
                .send(any(SimpleMailMessage.class));

        assertThatThrownBy(() -> userService.requestRegistrationCode(defaultRequest()))
                .isInstanceOf(EmailDeliveryException.class);
        assertThat(userRepository.count()).isZero();
        assertThat(pendingRegistrationRepository.count()).isZero();
    }

    private RegisterCodeRequest defaultRequest() {
        return new RegisterCodeRequest("Ayşe", "Demir", "Ayse@Example.com", "secret123");
    }

    private void makeResendAvailable() {
        PendingRegistration pendingRegistration = pendingRegistrationRepository.findByEmail("ayse@example.com").orElseThrow();
        pendingRegistration.setResendAvailableAt(Instant.now().minusSeconds(1));
        pendingRegistrationRepository.save(pendingRegistration);
    }
}

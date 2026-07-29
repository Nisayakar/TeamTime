package com.teamtime.service;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import com.teamtime.dto.RegisterCodeRequest;
import com.teamtime.dto.RegisterRequest;
import com.teamtime.dto.ResendRegistrationCodeRequest;
import com.teamtime.dto.VerifyRegistrationRequest;
import com.teamtime.entity.PendingRegistration;
import com.teamtime.entity.User;
import com.teamtime.exception.ResendCooldownException;
import com.teamtime.exception.TooManyVerificationAttemptsException;
import com.teamtime.exception.VerificationCodeException;
import com.teamtime.repository.PendingRegistrationRepository;
import com.teamtime.repository.UserRepository;
import com.teamtime.security.JwtService;
import com.teamtime.dto.LoginRequest;
import com.teamtime.dto.LoginResponse;
import com.teamtime.dto.ProfileResponse;
import com.teamtime.dto.UpdatePasswordRequest;
import com.teamtime.dto.UpdateProfileRequest;
import com.teamtime.dto.UserSearchResponse;
import com.teamtime.exception.DuplicateEmailException;
import com.teamtime.exception.InvalidCredentialsException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class UserService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int CODE_EXPIRATION_MINUTES = 10;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private final UserRepository userRepository;
    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final VerificationCodeGenerator verificationCodeGenerator;
    private final VerificationCodeHashService verificationCodeHashService;
    private final EmailVerificationMailService emailVerificationMailService;

    public UserService(
            UserRepository userRepository,
            PendingRegistrationRepository pendingRegistrationRepository,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            VerificationCodeGenerator verificationCodeGenerator,
            VerificationCodeHashService verificationCodeHashService,
            EmailVerificationMailService emailVerificationMailService
    ) {
        this.userRepository = userRepository;
        this.pendingRegistrationRepository = pendingRegistrationRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.verificationCodeGenerator = verificationCodeGenerator;
        this.verificationCodeHashService = verificationCodeHashService;
        this.emailVerificationMailService = emailVerificationMailService;
    }

    @Transactional
    public String register(RegisterRequest request) {
        RegisterCodeRequest codeRequest = new RegisterCodeRequest(
                request.getName(),
                request.getSurname(),
                request.getEmail(),
                request.getPassword());

        requestRegistrationCode(codeRequest);

        return "Doğrulama kodu e-posta adresinize gönderildi";
    }

    @Transactional
    public String requestRegistrationCode(RegisterCodeRequest request) {
        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateEmailException("Bu email adresi ile kayıtlı bir kullanıcı zaten var");
        }

        String code = verificationCodeGenerator.generateSixDigitCode();
        PendingRegistration pendingRegistration = pendingRegistrationRepository
                .findByEmail(email)
                .orElseGet(PendingRegistration::new);

        pendingRegistration.setFirstName(request.getFirstName().trim());
        pendingRegistration.setLastName(request.getLastName().trim());
        pendingRegistration.setEmail(email);
        pendingRegistration.setEncodedPassword(passwordEncoder.encode(request.getPassword()));
        updateVerificationCode(pendingRegistration, code);

        pendingRegistrationRepository.save(pendingRegistration);
        emailVerificationMailService.sendVerificationCode(email, code);

        return "Doğrulama kodu e-posta adresinize gönderildi";
    }

    @Transactional(noRollbackFor = VerificationCodeException.class)
    public String verifyRegistration(VerifyRegistrationRequest request) {
        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateEmailException("Bu email adresi ile kayıtlı bir kullanıcı zaten var");
        }

        PendingRegistration pendingRegistration = pendingRegistrationRepository
                .findByEmail(email)
                .orElseThrow(() -> new VerificationCodeException("Doğrulama kodu geçersiz"));

        Instant now = Instant.now();

        if (pendingRegistration.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            throw new TooManyVerificationAttemptsException("Çok fazla hatalı doğrulama denemesi yapıldı");
        }

        if (pendingRegistration.getExpiresAt().isBefore(now)) {
            throw new VerificationCodeException("Doğrulama kodunun süresi doldu");
        }

        if (!verificationCodeHashService.matches(email, request.getCode(), pendingRegistration.getVerificationCodeHash())) {
            pendingRegistration.setFailedAttempts(pendingRegistration.getFailedAttempts() + 1);
            pendingRegistrationRepository.save(pendingRegistration);
            throw new VerificationCodeException("Doğrulama kodu geçersiz");
        }

        User user = new User();
        user.setName(pendingRegistration.getFirstName());
        user.setSurname(pendingRegistration.getLastName());
        user.setEmail(email);
        user.setPassword(pendingRegistration.getEncodedPassword());

        userRepository.save(user);
        pendingRegistrationRepository.delete(pendingRegistration);

        return "Kullanıcı Başarıyla Kaydedildi";
    }

    @Transactional
    public String resendRegistrationCode(ResendRegistrationCodeRequest request) {
        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateEmailException("Bu email adresi ile kayıtlı bir kullanıcı zaten var");
        }

        PendingRegistration pendingRegistration = pendingRegistrationRepository
                .findByEmail(email)
                .orElseThrow(() -> new VerificationCodeException("Doğrulama kaydı bulunamadı"));

        Instant now = Instant.now();

        if (pendingRegistration.getResendAvailableAt().isAfter(now)) {
            throw new ResendCooldownException("Yeni doğrulama kodu istemek için lütfen bekleyin");
        }

        String code = verificationCodeGenerator.generateSixDigitCode();
        updateVerificationCode(pendingRegistration, code);

        pendingRegistrationRepository.save(pendingRegistration);
        emailVerificationMailService.sendVerificationCode(email, code);

        return "Doğrulama kodu e-posta adresinize gönderildi";
    }

    public LoginResponse login(LoginRequest request) {

        Optional<User> user = userRepository.findByEmailIgnoreCase(request.getEmail().trim());

        if (user.isEmpty()) {
            throw new InvalidCredentialsException("Email veya şifre hatalı");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.get().getPassword())) {
            throw new InvalidCredentialsException("Email veya şifre hatalı");
        }

        User loggedUser = user.get();
        String token = jwtService.generateToken(loggedUser);

        return new LoginResponse(
                loggedUser.getId(),
                loggedUser.getName(),
                loggedUser.getSurname(),
                loggedUser.getEmail(),
                token);
    }

    public ProfileResponse getProfile(Long userId) {
        User user = findUserById(userId);

        return toProfileResponse(user);
    }

    public ProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = findUserById(userId);
        String email = request.getEmail().trim();

        if (!user.getEmail().equalsIgnoreCase(email) && userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateEmailException("Bu email adresi ile kayıtlı bir kullanıcı zaten var");
        }

        user.setName(request.getName().trim());
        user.setSurname(request.getSurname().trim());
        user.setEmail(email);

        User updatedUser = userRepository.save(user);

        return toProfileResponse(updatedUser);
    }

    public String updatePassword(Long userId, UpdatePasswordRequest request) {
        User user = findUserById(userId);

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Eski şifre hatalı");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return "Şifre başarıyla güncellendi";
    }

    public List<UserSearchResponse> searchUsers(String query) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }

        String searchTerm = query.trim();

        return userRepository
                .findTop10ByNameContainingIgnoreCaseOrSurnameContainingIgnoreCase(searchTerm, searchTerm)
                .stream()
                .map(user -> new UserSearchResponse(
                        user.getId(),
                        user.getName(),
                        user.getSurname()))
                .toList();
    }

    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı"));
    }

    private ProfileResponse toProfileResponse(User user) {
        return new ProfileResponse(
                user.getId(),
                user.getName(),
                user.getSurname(),
                user.getEmail());
    }

    private void updateVerificationCode(PendingRegistration pendingRegistration, String code) {
        Instant now = Instant.now();
        pendingRegistration.setVerificationCodeHash(verificationCodeHashService.hash(pendingRegistration.getEmail(), code));
        pendingRegistration.setExpiresAt(now.plus(CODE_EXPIRATION_MINUTES, ChronoUnit.MINUTES));
        pendingRegistration.setFailedAttempts(0);
        pendingRegistration.setResendAvailableAt(now.plus(RESEND_COOLDOWN_SECONDS, ChronoUnit.SECONDS));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}

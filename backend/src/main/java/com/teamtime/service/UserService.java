package com.teamtime.service;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import com.teamtime.dto.RegisterCodeRequest;
import com.teamtime.dto.RegisterRequest;
import com.teamtime.dto.EmailChangeCodeRequest;
import com.teamtime.dto.PasswordResetCodeRequest;
import com.teamtime.dto.ResendRegistrationCodeRequest;
import com.teamtime.dto.ResetPasswordRequest;
import com.teamtime.dto.VerifyEmailChangeRequest;
import com.teamtime.dto.VerifyRegistrationRequest;
import com.teamtime.dto.VerifyPasswordResetCodeRequest;
import com.teamtime.entity.EmailChangeRequest;
import com.teamtime.entity.PendingRegistration;
import com.teamtime.entity.PasswordResetRequest;
import com.teamtime.entity.Project;
import com.teamtime.entity.Team;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.TeamRole;
import com.teamtime.entity.User;
import com.teamtime.exception.ResendCooldownException;
import com.teamtime.exception.TooManyVerificationAttemptsException;
import com.teamtime.exception.VerificationCodeException;
import com.teamtime.repository.PendingRegistrationRepository;
import com.teamtime.repository.PasswordResetRequestRepository;
import com.teamtime.repository.EmailChangeRequestRepository;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskRepository;
import com.teamtime.repository.TeamMemberRepository;
import com.teamtime.repository.NotificationRepository;
import com.teamtime.repository.TeamRepository;
import com.teamtime.repository.UserRepository;
import com.teamtime.security.JwtService;
import com.teamtime.dto.LoginRequest;
import com.teamtime.dto.LoginResponse;
import com.teamtime.dto.ProfileResponse;
import com.teamtime.dto.UpdatePasswordRequest;
import com.teamtime.dto.UpdateProfileRequest;
import com.teamtime.dto.UserSearchResponse;
import com.teamtime.exception.DuplicateEmailException;
import com.teamtime.exception.DuplicateUsernameException;
import com.teamtime.exception.InvalidCredentialsException;
import com.teamtime.exception.ResourceNotFoundException;
import com.teamtime.exception.ConflictException;

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
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final EmailChangeRequestRepository emailChangeRequestRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final VerificationCodeGenerator verificationCodeGenerator;
    private final VerificationCodeHashService verificationCodeHashService;
    private final EmailVerificationMailService emailVerificationMailService;
    private final NotificationRepository notificationRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;

    public UserService(
            UserRepository userRepository,
            PendingRegistrationRepository pendingRegistrationRepository,
            PasswordResetRequestRepository passwordResetRequestRepository,
            EmailChangeRequestRepository emailChangeRequestRepository,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            VerificationCodeGenerator verificationCodeGenerator,
            VerificationCodeHashService verificationCodeHashService,
            EmailVerificationMailService emailVerificationMailService,
            NotificationRepository notificationRepository,
            TaskRepository taskRepository,
            ProjectRepository projectRepository,
            TeamMemberRepository teamMemberRepository,
            TeamRepository teamRepository
    ) {
        this.userRepository = userRepository;
        this.pendingRegistrationRepository = pendingRegistrationRepository;
        this.passwordResetRequestRepository = passwordResetRequestRepository;
        this.emailChangeRequestRepository = emailChangeRequestRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.verificationCodeGenerator = verificationCodeGenerator;
        this.verificationCodeHashService = verificationCodeHashService;
        this.emailVerificationMailService = emailVerificationMailService;
        this.notificationRepository = notificationRepository;
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.teamRepository = teamRepository;
    }

    @Transactional
    public String register(RegisterRequest request) {
        RegisterCodeRequest codeRequest = new RegisterCodeRequest(
                request.getName(),
                request.getSurname(),
                request.getUsername(),
                request.getEmail(),
                request.getPassword());

        requestRegistrationCode(codeRequest);

        return "Doğrulama kodu e-posta adresinize gönderildi";
    }

    @Transactional
    public String requestRegistrationCode(RegisterCodeRequest request) {
        String email = normalizeEmail(request.getEmail());
        String username = request.getUsername().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateEmailException("Bu email adresi ile kayıtlı bir kullanıcı zaten var");
        }

        if (userRepository.existsByUsernameIgnoreCase(username) || pendingRegistrationRepository.existsByUsernameIgnoreCase(username)) {
            // Check if there is an expired pending registration blocking it
            PendingRegistration existingPending = pendingRegistrationRepository.findByEmail(email).orElse(null);
            if (existingPending != null && existingPending.getUsername().equalsIgnoreCase(username) && existingPending.getExpiresAt().isBefore(Instant.now())) {
                // It's the same user trying again, let it pass
            } else {
                throw new DuplicateUsernameException("Bu kullanıcı adı zaten kullanılıyor.");
            }
        }

        String code = verificationCodeGenerator.generateSixDigitCode();
        PendingRegistration pendingRegistration = pendingRegistrationRepository
                .findByEmail(email)
                .orElseGet(PendingRegistration::new);

        pendingRegistration.setFirstName(request.getFirstName().trim());
        pendingRegistration.setLastName(request.getLastName().trim());
        pendingRegistration.setUsername(username);
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
        user.setUsername(pendingRegistration.getUsername());
        user.setEmail(email);
        user.setPassword(pendingRegistration.getEncodedPassword());

        try {
            userRepository.save(user);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new DuplicateUsernameException("Bu kullanıcı adı zaten kullanılıyor.");
        }
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

    @Transactional
    public String requestPasswordResetCode(PasswordResetCodeRequest request) {
        String email = normalizeEmail(request.getEmail());
        Optional<User> user = userRepository.findByEmailIgnoreCase(email);

        if (user.isEmpty()) {
            return neutralPasswordResetMessage();
        }

        String code = verificationCodeGenerator.generateSixDigitCode();
        PasswordResetRequest resetRequest = passwordResetRequestRepository
                .findByEmail(email)
                .orElseGet(PasswordResetRequest::new);

        resetRequest.setEmail(email);
        updatePasswordResetCode(resetRequest, code);

        passwordResetRequestRepository.save(resetRequest);
        emailVerificationMailService.sendPasswordResetCode(email, code);

        return neutralPasswordResetMessage();
    }

    @Transactional(noRollbackFor = VerificationCodeException.class)
    public String verifyPasswordResetCode(VerifyPasswordResetCodeRequest request) {
        String email = normalizeEmail(request.getEmail());
        PasswordResetRequest resetRequest = findPasswordResetRequest(email);
        Instant now = Instant.now();

        if (resetRequest.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            throw new TooManyVerificationAttemptsException("Çok fazla hatalı doğrulama denemesi yapıldı");
        }

        if (resetRequest.getExpiresAt().isBefore(now)) {
            throw new VerificationCodeException("Doğrulama kodunun süresi doldu");
        }

        if (!verificationCodeHashService.matches(email, request.getCode(), resetRequest.getVerificationCodeHash())) {
            resetRequest.setFailedAttempts(resetRequest.getFailedAttempts() + 1);
            passwordResetRequestRepository.save(resetRequest);
            throw new VerificationCodeException("Doğrulama kodu geçersiz");
        }

        resetRequest.setVerified(true);
        passwordResetRequestRepository.save(resetRequest);

        return "Doğrulama kodu onaylandı";
    }

    @Transactional
    public String resetPassword(ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Şifreler uyuşmuyor");
        }

        String email = normalizeEmail(request.getEmail());
        PasswordResetRequest resetRequest = findPasswordResetRequest(email);
        Instant now = Instant.now();

        if (!resetRequest.isVerified()) {
            throw new VerificationCodeException("Şifre sıfırlama kodu doğrulanmalı");
        }

        if (resetRequest.getExpiresAt().isBefore(now)) {
            throw new VerificationCodeException("Doğrulama kodunun süresi doldu");
        }

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new VerificationCodeException("Şifre sıfırlama isteği geçersiz"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        passwordResetRequestRepository.delete(resetRequest);

        return "Şifreniz başarıyla güncellendi";
    }

    @Transactional
    public String resendPasswordResetCode(PasswordResetCodeRequest request) {
        String email = normalizeEmail(request.getEmail());

        if (!userRepository.existsByEmailIgnoreCase(email)) {
            return neutralPasswordResetMessage();
        }

        PasswordResetRequest resetRequest = passwordResetRequestRepository
                .findByEmail(email)
                .orElse(null);

        if (resetRequest == null) {
            return requestPasswordResetCode(request);
        }

        Instant now = Instant.now();

        if (resetRequest.getResendAvailableAt().isAfter(now)) {
            throw new ResendCooldownException("Yeni doğrulama kodu istemek için lütfen bekleyin");
        }

        String code = verificationCodeGenerator.generateSixDigitCode();
        updatePasswordResetCode(resetRequest, code);

        passwordResetRequestRepository.save(resetRequest);
        emailVerificationMailService.sendPasswordResetCode(email, code);

        return neutralPasswordResetMessage();
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

    @Transactional
    public ProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = findUserById(userId);

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String requestedEmail = normalizeEmail(request.getEmail());

            if (!user.getEmail().equalsIgnoreCase(requestedEmail)) {
                throw new IllegalArgumentException("E-posta adresi doğrulama kodu ile değiştirilmelidir");
            }
        }

        user.setName(request.getName().trim());
        user.setSurname(request.getSurname().trim());
        
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            String newUsername = request.getUsername().trim().toLowerCase(Locale.ROOT);
            if (!newUsername.matches("^[a-z0-9_.]+$") || newUsername.length() < 3 || newUsername.length() > 30) {
                throw new IllegalArgumentException("Geçersiz kullanıcı adı formatı");
            }
            if (!user.getUsername().equalsIgnoreCase(newUsername)) {
                if (userRepository.existsByUsernameIgnoreCase(newUsername)) {
                    throw new DuplicateUsernameException("Bu kullanıcı adı zaten kullanılıyor.");
                }
                user.setUsername(newUsername);
            }
        }

        User updatedUser;
        try {
            updatedUser = userRepository.save(user);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new DuplicateUsernameException("Bu kullanıcı adı zaten kullanılıyor.");
        }

        return toProfileResponse(updatedUser);
    }

    public boolean isUsernameAvailable(String username, Long currentUserId) {
        if (username == null || username.isBlank()) {
            return false;
        }
        String normalized = username.trim().toLowerCase(Locale.ROOT);
        if (!normalized.matches("^[a-z0-9_.]+$") || normalized.length() < 3 || normalized.length() > 30) {
            return false;
        }

        if (currentUserId != null) {
            Optional<User> currentUser = userRepository.findById(currentUserId);
            if (currentUser.isPresent() && currentUser.get().getUsername().equalsIgnoreCase(normalized)) {
                return true;
            }
        }

        return !userRepository.existsByUsernameIgnoreCase(normalized) && 
               !pendingRegistrationRepository.existsByUsernameIgnoreCase(normalized);
    }

    @Transactional
    public String requestEmailChangeCode(Long userId, EmailChangeCodeRequest request) {
        User user = findUserById(userId);
        String newEmail = validateNewEmail(user, request.getEmail());
        Instant now = Instant.now();

        EmailChangeRequest emailChangeRequest = emailChangeRequestRepository
                .findByUserIdAndNewEmailIgnoreCase(userId, newEmail)
                .orElseGet(EmailChangeRequest::new);

        if (emailChangeRequest.getId() != null && emailChangeRequest.getResendAvailableAt().isAfter(now)) {
            throw new ResendCooldownException("Yeni doğrulama kodu istemek için lütfen bekleyin");
        }

        String code = verificationCodeGenerator.generateSixDigitCode();
        emailChangeRequest.setUser(user);
        emailChangeRequest.setNewEmail(newEmail);
        updateEmailChangeCode(emailChangeRequest, newEmail, code);

        emailChangeRequestRepository.save(emailChangeRequest);
        emailVerificationMailService.sendEmailChangeCode(newEmail, code);

        return "Doğrulama kodu yeni e-posta adresinize gönderildi";
    }

    @Transactional
    public String resendEmailChangeCode(Long userId, EmailChangeCodeRequest request) {
        User user = findUserById(userId);
        String newEmail = validateNewEmail(user, request.getEmail());
        EmailChangeRequest emailChangeRequest = findEmailChangeRequest(userId, newEmail);
        Instant now = Instant.now();

        if (emailChangeRequest.getResendAvailableAt().isAfter(now)) {
            throw new ResendCooldownException("Yeni doğrulama kodu istemek için lütfen bekleyin");
        }

        String code = verificationCodeGenerator.generateSixDigitCode();
        updateEmailChangeCode(emailChangeRequest, newEmail, code);

        emailChangeRequestRepository.save(emailChangeRequest);
        emailVerificationMailService.sendEmailChangeCode(newEmail, code);

        return "Doğrulama kodu yeni e-posta adresinize gönderildi";
    }

    @Transactional(noRollbackFor = VerificationCodeException.class)
    public ProfileResponse verifyEmailChange(Long userId, VerifyEmailChangeRequest request) {
        User user = findUserById(userId);
        String newEmail = validateNewEmail(user, request.getEmail());
        EmailChangeRequest emailChangeRequest = findEmailChangeRequest(userId, newEmail);
        Instant now = Instant.now();

        if (emailChangeRequest.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            throw new TooManyVerificationAttemptsException("Çok fazla hatalı doğrulama denemesi yapıldı");
        }

        if (emailChangeRequest.getExpiresAt().isBefore(now)) {
            throw new VerificationCodeException("Doğrulama kodunun süresi doldu");
        }

        if (!verificationCodeHashService.matches(newEmail, request.getCode(), emailChangeRequest.getVerificationCodeHash())) {
            emailChangeRequest.setFailedAttempts(emailChangeRequest.getFailedAttempts() + 1);
            emailChangeRequestRepository.save(emailChangeRequest);
            throw new VerificationCodeException("Doğrulama kodu geçersiz");
        }

        user.setEmail(newEmail);
        User updatedUser = userRepository.save(user);
        emailChangeRequestRepository.delete(emailChangeRequest);

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

    @Transactional
    public void deleteProfile(Long userId) {
        User user = findUserById(userId);
        String email = normalizeEmail(user.getEmail());

        notificationRepository.deleteByRecipientId(userId);
        passwordResetRequestRepository.deleteByEmail(email);
        pendingRegistrationRepository.deleteByEmail(email);
        emailChangeRequestRepository.deleteByUserId(userId);

        handleOwnedTeamsBeforeAccountDeletion(user);
        transferRemainingTeamProjectsCreatedBy(user);
        deleteNonOwnerMemberships(userId);
        deletePersonalProjects(userId);

        userRepository.delete(user);
    }

    private void handleOwnedTeamsBeforeAccountDeletion(User user) {
        List<TeamMember> ownerMemberships = teamMemberRepository
                .findByUserIdAndRoleIn(user.getId(), List.of(TeamRole.OWNER.name()));

        for (TeamMember ownerMembership : ownerMemberships) {
            Team team = ownerMembership.getTeam();
            List<TeamMember> otherMembers = teamMemberRepository
                    .findByTeamIdAndUserIdNotOrderByJoinedDateAsc(team.getId(), user.getId());
            Optional<TeamMember> nextOwner = chooseNextOwner(otherMembers);

            if (nextOwner.isPresent()) {
                TeamMember promotedMember = nextOwner.get();
                promotedMember.setRole(TeamRole.OWNER.name());
                teamMemberRepository.save(promotedMember);
                transferTeamProjectsCreatedBy(team.getId(), user.getId(), promotedMember.getUser());
                teamMemberRepository.delete(ownerMembership);
            } else if (projectRepository.existsByTeam_Id(team.getId())) {
                throw new ConflictException("Sahibi olduğunuz ve projelere bağlı takımlar bulunduğu için hesabınız silinemiyor. Önce takım projelerini silin veya takım sahipliğini başka bir üyeye devredin.");
            } else {
                teamMemberRepository.delete(ownerMembership);
                teamRepository.delete(team);
            }
        }
    }

    private Optional<TeamMember> chooseNextOwner(List<TeamMember> members) {
        Optional<TeamMember> admin = members.stream()
                .filter(member -> TeamRole.from(member.getRole()) == TeamRole.ADMIN)
                .findFirst();

        if (admin.isPresent()) {
            return admin;
        }

        return members.stream()
                .filter(member -> TeamRole.from(member.getRole()) == TeamRole.MEMBER)
                .findFirst();
    }

    private void transferRemainingTeamProjectsCreatedBy(User user) {
        List<Project> teamProjects = projectRepository.findByUserIdAndTeamIsNotNull(user.getId());

        for (Project project : teamProjects) {
            User owner = findTeamOwner(project.getTeam().getId())
                    .orElseThrow(() -> new ConflictException("Takım projeleri için geçerli bir takım sahibi bulunamadı."));
            project.setUser(owner);
            projectRepository.save(project);
        }
    }

    private void transferTeamProjectsCreatedBy(Long teamId, Long userId, User nextOwner) {
        for (Project project : projectRepository.findByTeam_IdAndUserId(teamId, userId)) {
            project.setUser(nextOwner);
            projectRepository.save(project);
        }
    }

    private Optional<User> findTeamOwner(Long teamId) {
        return teamMemberRepository.findByTeamId(teamId)
                .stream()
                .filter(member -> TeamRole.from(member.getRole()) == TeamRole.OWNER)
                .map(TeamMember::getUser)
                .findFirst();
    }

    private void deleteNonOwnerMemberships(Long userId) {
        teamMemberRepository
                .findByUserIdAndRoleIn(userId, List.of(TeamRole.ADMIN.name(), TeamRole.MEMBER.name()))
                .forEach(teamMemberRepository::delete);
    }

    private void deletePersonalProjects(Long userId) {
        List<Project> personalProjects = projectRepository.findByUserIdAndTeamIsNull(userId);

        for (Project project : personalProjects) {
            taskRepository.deleteByProjectId(project.getId());
            projectRepository.delete(project);
        }
    }

    public List<UserSearchResponse> searchUsers(String query) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }

        String searchTerm = query.trim().toLowerCase(Locale.ROOT);

        List<User> foundUsers = userRepository
                .findTop10ByUsernameContainingIgnoreCaseOrNameContainingIgnoreCaseOrSurnameContainingIgnoreCase(searchTerm, searchTerm, searchTerm);

        return foundUsers.stream()
                .sorted((u1, u2) -> {
                    boolean exact1 = u1.getUsername().equalsIgnoreCase(searchTerm);
                    boolean exact2 = u2.getUsername().equalsIgnoreCase(searchTerm);
                    if (exact1 && !exact2) return -1;
                    if (!exact1 && exact2) return 1;

                    boolean prefix1 = u1.getUsername().toLowerCase(Locale.ROOT).startsWith(searchTerm);
                    boolean prefix2 = u2.getUsername().toLowerCase(Locale.ROOT).startsWith(searchTerm);
                    if (prefix1 && !prefix2) return -1;
                    if (!prefix1 && prefix2) return 1;

                    return u1.getName().compareToIgnoreCase(u2.getName());
                })
                .map(user -> new UserSearchResponse(
                        user.getId(),
                        user.getName(),
                        user.getSurname(),
                        user.getUsername()))
                .toList();
    }

    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));
    }

    private ProfileResponse toProfileResponse(User user) {
        return new ProfileResponse(
                user.getId(),
                user.getName(),
                user.getSurname(),
                user.getUsername(),
                user.getEmail());
    }

    private void updateVerificationCode(PendingRegistration pendingRegistration, String code) {
        Instant now = Instant.now();
        pendingRegistration.setVerificationCodeHash(verificationCodeHashService.hash(pendingRegistration.getEmail(), code));
        pendingRegistration.setExpiresAt(now.plus(CODE_EXPIRATION_MINUTES, ChronoUnit.MINUTES));
        pendingRegistration.setFailedAttempts(0);
        pendingRegistration.setResendAvailableAt(now.plus(RESEND_COOLDOWN_SECONDS, ChronoUnit.SECONDS));
    }

    private void updatePasswordResetCode(PasswordResetRequest resetRequest, String code) {
        Instant now = Instant.now();
        resetRequest.setVerificationCodeHash(verificationCodeHashService.hash(resetRequest.getEmail(), code));
        resetRequest.setExpiresAt(now.plus(CODE_EXPIRATION_MINUTES, ChronoUnit.MINUTES));
        resetRequest.setFailedAttempts(0);
        resetRequest.setResendAvailableAt(now.plus(RESEND_COOLDOWN_SECONDS, ChronoUnit.SECONDS));
        resetRequest.setVerified(false);
    }

    private void updateEmailChangeCode(EmailChangeRequest emailChangeRequest, String newEmail, String code) {
        Instant now = Instant.now();
        emailChangeRequest.setVerificationCodeHash(verificationCodeHashService.hash(newEmail, code));
        emailChangeRequest.setExpiresAt(now.plus(CODE_EXPIRATION_MINUTES, ChronoUnit.MINUTES));
        emailChangeRequest.setFailedAttempts(0);
        emailChangeRequest.setResendAvailableAt(now.plus(RESEND_COOLDOWN_SECONDS, ChronoUnit.SECONDS));
    }

    private EmailChangeRequest findEmailChangeRequest(Long userId, String newEmail) {
        return emailChangeRequestRepository
                .findByUserIdAndNewEmailIgnoreCase(userId, newEmail)
                .orElseThrow(() -> new VerificationCodeException("Doğrulama kodu geçersiz"));
    }

    private String validateNewEmail(User user, String email) {
        String newEmail = normalizeEmail(email);

        if (user.getEmail().equalsIgnoreCase(newEmail)) {
            throw new IllegalArgumentException("Mevcut e-posta adresinizden farklı bir e-posta girin");
        }

        if (userRepository.existsByEmailIgnoreCase(newEmail)) {
            throw new DuplicateEmailException("Bu email adresi ile kayıtlı bir kullanıcı zaten var");
        }

        return newEmail;
    }

    private PasswordResetRequest findPasswordResetRequest(String email) {
        return passwordResetRequestRepository
                .findByEmail(email)
                .orElseThrow(() -> new VerificationCodeException("Doğrulama kodu geçersiz"));
    }

    private String neutralPasswordResetMessage() {
        return "Eğer bu e-posta adresiyle kayıtlı bir hesap varsa şifre sıfırlama kodu gönderildi";
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}

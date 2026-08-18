package com.teamtime;

import com.teamtime.entity.Notification;
import com.teamtime.entity.NotificationType;
import com.teamtime.entity.User;
import com.teamtime.event.NotificationEvent;
import com.teamtime.repository.NotificationRepository;
import com.teamtime.repository.UserRepository;
import com.teamtime.service.NotificationEmailService;
import com.teamtime.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
    "spring.mail.username=test@teamtime.com"
})
@ActiveProfiles("test")
public class NotificationEmailServiceTests {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @MockBean
    private JavaMailSender javaMailSender;

    @Test
    void shouldSendEmailOnTeamInvitation() {
        User recipient = new User();
        recipient.setEmail("test@teamtime.com");
        recipient.setName("Test");
        recipient.setSurname("User");
        recipient.setUsername("testuser");
        recipient.setPassword("hash");
        recipient = userRepository.save(recipient);

        final User finalRecipient = recipient;

        transactionTemplate.execute(status -> {
            notificationService.createNotification(
                    finalRecipient,
                    "Takım daveti",
                    "Davet mesajı",
                    NotificationType.TEAM_INVITATION,
                    1L,
                    "TEAM"
            );
            return null;
        });

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(javaMailSender, timeout(1000).times(1)).send(messageCaptor.capture());

        SimpleMailMessage sentMessage = messageCaptor.getValue();
        assertThat(sentMessage.getTo()).containsExactly("test@teamtime.com");
        assertThat(sentMessage.getSubject()).isEqualTo("TeamTime - Takım daveti");
        assertThat(sentMessage.getText()).contains("Merhaba Test");
        assertThat(sentMessage.getText()).contains("Davet mesajı");
    }

    @Test
    void shouldNotSendEmailIfEmailIsBlank() {
        User recipient = new User();
        recipient.setEmail("");
        recipient.setName("NoEmail");
        recipient.setSurname("User");
        recipient.setUsername("noemailuser");
        recipient.setPassword("hash");
        recipient = userRepository.save(recipient);

        final User finalRecipient = recipient;

        transactionTemplate.execute(status -> {
            notificationService.createNotification(
                    finalRecipient,
                    "Takım daveti",
                    "Davet mesajı",
                    NotificationType.TEAM_INVITATION,
                    1L,
                    "TEAM"
            );
            return null;
        });

        verify(javaMailSender, timeout(1000).times(0)).send(any(SimpleMailMessage.class));
        
        long count = notificationRepository.countByRecipientIdAndReadFalse(recipient.getId());
        assertThat(count).isEqualTo(1);
    }

    @Test
    void mailFailureShouldNotRollbackTransaction() {
        User recipient = new User();
        recipient.setEmail("fail@teamtime.com");
        recipient.setName("Fail");
        recipient.setSurname("User");
        recipient.setUsername("failuser");
        recipient.setPassword("hash");
        recipient = userRepository.save(recipient);

        doThrow(new MailException("Simulated mail failure") {}).when(javaMailSender).send(any(SimpleMailMessage.class));

        final User finalRecipient = recipient;

        transactionTemplate.execute(status -> {
            notificationService.createNotification(
                    finalRecipient,
                    "Takım daveti",
                    "Davet mesajı",
                    NotificationType.TEAM_INVITATION,
                    1L,
                    "TEAM"
            );
            return null;
        });

        verify(javaMailSender, timeout(1000).times(1)).send(any(SimpleMailMessage.class));

        long count = notificationRepository.countByRecipientIdAndReadFalse(recipient.getId());
        assertThat(count).isEqualTo(1);
    }
    
    @Test
    void shouldNotSendDuplicateEmails() {
        User recipient = new User();
        recipient.setEmail("duplicate@teamtime.com");
        recipient.setName("Dup");
        recipient.setSurname("User");
        recipient.setUsername("dupuser");
        recipient.setPassword("hash");
        recipient = userRepository.save(recipient);

        final User finalRecipient = recipient;

        transactionTemplate.execute(status -> {
            notificationService.createNotification(
                    finalRecipient,
                    "Görev Atandı",
                    "Görev mesajı",
                    NotificationType.TASK_ASSIGNED,
                    1L,
                    "TASK"
            );
            return null;
        });

        verify(javaMailSender, timeout(1000).times(1)).send(any(SimpleMailMessage.class));
    }
}

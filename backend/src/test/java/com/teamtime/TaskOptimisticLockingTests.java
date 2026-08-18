package com.teamtime;

import com.teamtime.entity.Task;
import com.teamtime.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:task-concurrency;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "verification.code.secret=test-secret",
        "spring.mail.username=noreply@teamtime.test"
})
class TaskOptimisticLockingTests {

    @Autowired
    private TaskRepository taskRepository;

    @Test
    void testOptimisticLockingOnConcurrentTaskUpdate() {
        // 1. Task DB'ye kaydedilir.
        Task task = new Task();
        task.setTitle("Original Task Title");
        task.setStatus("BEKLIYOR");
        task = taskRepository.saveAndFlush(task);
        Long taskId = task.getId();

        // 2. Aynı Task iki ayrı persistence context/entity instance olarak yüklenir.
        Task task1 = taskRepository.findById(taskId).orElseThrow();
        Task task2 = taskRepository.findById(taskId).orElseThrow();

        // 3. İlk instance güncellenir ve saveAndFlush edilir.
        task1.setTitle("Updated Title 1");
        taskRepository.saveAndFlush(task1);

        // 4. İkinci stale instance başka bir değişiklik yapıp flush etmeye çalışır.
        task2.setTitle("Updated Title 2");

        // 5. Optimistic locking exception oluşması doğrulanır.
        assertThatExceptionOfType(ObjectOptimisticLockingFailureException.class)
                .isThrownBy(() -> {
                    taskRepository.saveAndFlush(task2);
                });
    }
}

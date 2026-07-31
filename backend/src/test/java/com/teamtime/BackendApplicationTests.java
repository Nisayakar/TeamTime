package com.teamtime;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
		"spring.datasource.url=jdbc:h2:mem:backend-context;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
		"spring.datasource.driver-class-name=org.h2.Driver",
		"spring.jpa.hibernate.ddl-auto=create-drop",
		"spring.jpa.show-sql=false",
		"jwt.secret=test-jwt-secret-with-at-least-32-characters",
		"verification.code.secret=test-secret",
		"spring.mail.username=noreply@teamtime.test"
})
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}

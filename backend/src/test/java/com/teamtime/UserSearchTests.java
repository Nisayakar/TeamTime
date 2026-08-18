package com.teamtime;

import com.teamtime.dto.UserSearchResponse;
import com.teamtime.entity.User;
import com.teamtime.repository.UserRepository;
import com.teamtime.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserSearchTests {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User user1;
    private User user2;
    private User user3;
    private User user4;

    @BeforeEach
    void setUp() {
        user1 = new User();
        user1.setId(1L);
        user1.setUsername("nisayakar");
        user1.setEmail("nisa.yakar@gmail.com");
        user1.setName("Nisa");
        user1.setSurname("Yakar");

        user2 = new User();
        user2.setId(2L);
        user2.setUsername("nisayakar2");
        user2.setEmail("nisayakar@hotmail.com");
        user2.setName("Nisa");
        user2.setSurname("Yakar");

        user3 = new User();
        user3.setId(3L);
        user3.setUsername("ahmet");
        user3.setEmail("ahmet@nisayakar.com");
        user3.setName("Ahmet");
        user3.setSurname("Yilmaz");

        user4 = new User();
        user4.setId(4L);
        user4.setUsername("ali");
        user4.setEmail("ali@gmail.com");
        user4.setName("Ali");
        user4.setSurname("Yakar");
    }

    @Test
    void searchUsers_withExactUsername_shouldRankFirst() {
        when(userRepository.searchUsers(eq("nisayakar"), any(Pageable.class)))
                .thenReturn(List.of(user2, user3, user1)); // return out of order

        List<UserSearchResponse> results = userService.searchUsers("nisayakar");

        assertEquals(3, results.size());
        assertEquals("nisayakar", results.get(0).getUsername()); // user1
        assertEquals("nisayakar@hotmail.com", results.get(1).getEmail()); // exact email (user2) or prefix
    }

    @Test
    void searchUsers_withAtSymbol_shouldStripAtSymbol() {
        when(userRepository.searchUsers(eq("nisayakar"), any(Pageable.class)))
                .thenReturn(List.of(user1, user2));

        List<UserSearchResponse> results = userService.searchUsers("@nisayakar");

        assertEquals(2, results.size());
        assertEquals("nisayakar", results.get(0).getUsername());
    }

    @Test
    void searchUsers_withExactEmail_shouldRankHigh() {
        when(userRepository.searchUsers(eq("nisa.yakar@gmail.com"), any(Pageable.class)))
                .thenReturn(List.of(user2, user1));

        List<UserSearchResponse> results = userService.searchUsers("nisa.yakar@gmail.com");

        assertEquals(2, results.size());
        assertEquals("nisa.yakar@gmail.com", results.get(0).getEmail()); // user1
    }

    @Test
    void searchUsers_caseInsensitive() {
        when(userRepository.searchUsers(eq("nisayakar"), any(Pageable.class)))
                .thenReturn(List.of(user1));

        List<UserSearchResponse> results = userService.searchUsers("NisaYakar");

        assertEquals(1, results.size());
        assertEquals("nisayakar", results.get(0).getUsername());
    }

    @Test
    void searchUsers_sameNameUsers_canBeDistinguished() {
        when(userRepository.searchUsers(eq("yakar"), any(Pageable.class)))
                .thenReturn(List.of(user1, user2, user4));

        List<UserSearchResponse> results = userService.searchUsers("yakar");

        assertEquals(3, results.size());
        // All contain 'yakar'. No exact matches for username/email "yakar".
        // They should be sorted by name/surname or whatever remains.
        assertNotNull(results.get(0).getUsername());
        assertNotNull(results.get(1).getUsername());
        assertNotEquals(results.get(0).getUsername(), results.get(1).getUsername());
    }
}

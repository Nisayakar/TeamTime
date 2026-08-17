package com.teamtime.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.List;

public class TeamRequestTest {
    @Test
    public void testDeserialization() throws Exception {
        String json = "{\"name\":\"Test\",\"description\":\"Desc\",\"memberIds\":[2,3]}";
        ObjectMapper mapper = new ObjectMapper();
        TeamRequest req = mapper.readValue(json, TeamRequest.class);
        assertEquals("Test", req.getName());
        assertEquals("Desc", req.getDescription());
        assertNotNull(req.getMemberIds());
        assertEquals(2, req.getMemberIds().size());
    }
}

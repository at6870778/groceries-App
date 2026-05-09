package com.khanago.grocery.integration;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    protected static String customerToken;
    protected static String adminToken;

    @BeforeEach
    void setUpTokens() throws Exception {
        if (customerToken == null) {
            customerToken = loginAndGetToken("9999999993", "Demo Customer", "CUSTOMER");
        }
        if (adminToken == null) {
            adminToken = loginAndGetToken("9999999991", "Demo Admin", "ADMIN");
        }
    }

    protected String getCustomerToken() {
        return customerToken;
    }

    protected String getAdminToken() {
        return adminToken;
    }

    protected String extractJsonPath(String json, String path) {
        try {
            Object value = JsonPath.read(json, path);
            return value == null ? null : String.valueOf(value);
        } catch (Exception e) {
            return null;
        }
    }

    protected String loginAndGetToken(String phone, String fullName, String role) throws Exception {
        mockMvc.perform(post("/api/auth/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + phone + "\"}"))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + phone + "\",\"otp\":\"123456\",\"fullName\":\"" + fullName + "\",\"role\":\"" + role + "\"}"))
                .andExpect(status().isOk())
                .andReturn();

        return extractJsonPath(result.getResponse().getContentAsString(), "$.data.token");
    }
}

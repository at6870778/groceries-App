package com.khanago.grocery.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class DeliveryIntegrationTest extends BaseIntegrationTest {

    @Test
    public void testDeliveryBoyLogin() throws Exception {
        String requestOtpPayload = """
                {
                  "phone": "9876543210"
                }
                """;

        mockMvc.perform(post("/api/auth/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestOtpPayload))
                .andExpect(status().isOk());

        String verifyOtpPayload = """
                {
                  "phone": "9876543210",
                  "otp": "123456",
                  "fullName": "Delivery Boy",
                  "role": "DELIVERY_BOY"
                }
                """;

        MvcResult result = mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(verifyOtpPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").value(notNullValue()))
                .andExpect(jsonPath("$.data.roles[0]").value("DELIVERY_BOY"))
                .andReturn();

        String token = extractJsonPath(result.getResponse().getContentAsString(), "$.data.token");
        String userId = extractJsonPath(result.getResponse().getContentAsString(), "$.data.userId");

        org.junit.jupiter.api.Assertions.assertNotNull(token);
        org.junit.jupiter.api.Assertions.assertNotNull(userId);
    }

    @Test
    public void testDeliveryBoyViewAssignedOrders() throws Exception {
        String requestOtpPayload = """
                {
                  "phone": "9876543211"
                }
                """;

        mockMvc.perform(post("/api/auth/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestOtpPayload))
                .andExpect(status().isOk());

        String verifyOtpPayload = """
                {
                  "phone": "9876543211",
                  "otp": "123456",
                  "fullName": "Delivery Partner",
                  "role": "DELIVERY_BOY"
                }
                """;

        MvcResult loginResult = mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(verifyOtpPayload))
                .andExpect(status().isOk())
                .andReturn();

        String token = extractJsonPath(loginResult.getResponse().getContentAsString(), "$.data.token");

        mockMvc.perform(get("/api/delivery/orders")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    public void testDeliveryBoyRoleIsolation() throws Exception {
        String request1 = """
                {
                  "phone": "9876543214"
                }
                """;

        mockMvc.perform(post("/api/auth/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request1))
                .andExpect(status().isOk());

        String verify1 = """
                {
                  "phone": "9876543214",
                  "otp": "123456",
                  "fullName": "Delivery Boy 4",
                  "role": "DELIVERY_BOY"
                }
                """;

        MvcResult login1 = mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(verify1))
                .andExpect(status().isOk())
                .andReturn();

        String token1 = extractJsonPath(login1.getResponse().getContentAsString(), "$.data.token");

        String request2 = """
                {
                  "phone": "9876543215"
                }
                """;

        mockMvc.perform(post("/api/auth/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request2))
                .andExpect(status().isOk());

        String verify2 = """
                {
                  "phone": "9876543215",
                  "otp": "123456",
                  "fullName": "Delivery Boy 5",
                  "role": "DELIVERY_BOY"
                }
                """;

        MvcResult login2 = mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(verify2))
                .andExpect(status().isOk())
                .andReturn();

        String token2 = extractJsonPath(login2.getResponse().getContentAsString(), "$.data.token");

        mockMvc.perform(get("/api/delivery/orders")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/delivery/orders")
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/delivery/orders")
                        .header("Authorization", "Bearer " + getCustomerToken()))
                .andExpect(status().isForbidden());
    }
}

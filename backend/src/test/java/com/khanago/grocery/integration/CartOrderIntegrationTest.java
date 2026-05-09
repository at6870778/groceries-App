package com.khanago.grocery.integration;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CartOrderIntegrationTest extends BaseIntegrationTest {

    @Test
    void shouldAddToCartAndCheckout() throws Exception {
        MvcResult productResult = mockMvc.perform(get("/api/catalog/products?page=0&size=1"))
                .andExpect(status().isOk())
                .andReturn();
        Number productIdValue = JsonPath.read(productResult.getResponse().getContentAsString(), "$.content[0].id");
        long productId = productIdValue.longValue();

        MvcResult addressResult = mockMvc.perform(get("/api/customer/profile/addresses")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andReturn();
        Number addressIdValue = JsonPath.read(addressResult.getResponse().getContentAsString(), "$[0].id");
        long addressId = addressIdValue.longValue();

        mockMvc.perform(post("/api/customer/cart/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + productId + ",\"quantity\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].productId").value(productId));

        mockMvc.perform(get("/api/customer/cart")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1));

        mockMvc.perform(post("/api/customer/orders/checkout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"addressId\":" + addressId + ",\"notes\":\"Integration test checkout\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.paymentMode").value("COD"));

        mockMvc.perform(get("/api/customer/orders")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].status").exists());
    }
}

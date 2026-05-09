package com.khanago.grocery.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class AdminIntegrationTest extends BaseIntegrationTest {

    @Test
    public void testAdminCreateCategory() throws Exception {
        String uniqueSlug = "beverages-" + System.currentTimeMillis();
        String createCategoryRequest = """
                {
                  "name": "Beverages",
                  "slug": "%s",
                  "imageUrl": "https://example.com/beverages.jpg"
                }
                """.formatted(uniqueSlug);

        mockMvc.perform(post("/api/admin/catalog/categories")
                        .header("Authorization", "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createCategoryRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(greaterThan(0)))
                .andExpect(jsonPath("$.name").value("Beverages"))
                .andExpect(jsonPath("$.slug").value(startsWith("beverages-")));
    }

    @Test
    public void testAdminGetCategories() throws Exception {
        mockMvc.perform(get("/api/admin/catalog/categories")
                        .header("Authorization", "Bearer " + getAdminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(greaterThan(0)))
                .andExpect(jsonPath("$[0].id").value(notNullValue()));
    }

    @Test
    public void testAdminCreateProduct() throws Exception {
        MvcResult categoryResult = mockMvc.perform(get("/api/catalog/categories")
                        .header("Authorization", "Bearer " + getAdminToken()))
                .andExpect(status().isOk())
                .andReturn();

        String categoryId = extractJsonPath(categoryResult.getResponse().getContentAsString(), "$[0].id");

        String createProductRequest = """
                {
                  "name": "Orange Juice",
                  "sku": "OJ-001",
                  "description": "Fresh orange juice",
                  "unit": "1L",
                  "categoryId": %s,
                  "mrp": 120.00,
                  "sellingPrice": 99.99,
                  "stockQty": 50,
                  "imageUrl": "https://example.com/oj.jpg"
                }
                """.formatted(categoryId);

        mockMvc.perform(post("/api/admin/catalog/products")
                        .header("Authorization", "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createProductRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(greaterThan(0)))
                .andExpect(jsonPath("$.name").value("Orange Juice"))
                .andExpect(jsonPath("$.sellingPrice").value(99.99));
    }

    @Test
    public void testAdminUpdateProduct() throws Exception {
        MvcResult productResult = mockMvc.perform(get("/api/catalog/products")
                        .header("Authorization", "Bearer " + getAdminToken()))
                .andExpect(status().isOk())
                .andReturn();

        String productId = extractJsonPath(productResult.getResponse().getContentAsString(), "$.content[0].id");
        String categoryId = extractJsonPath(productResult.getResponse().getContentAsString(), "$.content[0].categoryId");

        String updateProductRequest = """
                {
                  "categoryId": %s,
                  "name": "Updated Product",
                  "sku": "UPD-001",
                  "description": "Updated description",
                  "unit": "500g",
                  "mrp": 150.00,
                  "sellingPrice": 120.00,
                  "stockQty": 75,
                  "active": true
                }
                """.formatted(categoryId);

        mockMvc.perform(put("/api/admin/catalog/products/" + productId)
                        .header("Authorization", "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateProductRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sellingPrice").value(120.00))
                .andExpect(jsonPath("$.stockQty").value(75));
    }

    @Test
    public void testAdminCreateCustomer() throws Exception {
        String createUserRequest = """
                {
                  "fullName": "Test Customer",
                  "phone": "9999888888",
                  "role": "CUSTOMER"
                }
                """;

        mockMvc.perform(post("/api/admin/customers")
                        .header("Authorization", "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createUserRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(notNullValue()))
                .andExpect(jsonPath("$.phone").value("9999888888"));
    }

    @Test
    public void testAdminCreateDeliveryBoy() throws Exception {
        String createUserRequest = """
                {
                  "fullName": "Delivery Partner",
                  "phone": "9999777777",
                  "role": "DELIVERY_BOY"
                }
                """;

        mockMvc.perform(post("/api/admin/delivery-boys")
                        .header("Authorization", "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createUserRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(notNullValue()))
                .andExpect(jsonPath("$.roles[0]").value("DELIVERY_BOY"));
    }

    @Test
    public void testAdminToggleUserActive() throws Exception {
        String createUserRequest = """
                {
                  "fullName": "Toggle User",
                  "phone": "9999666666",
                  "role": "CUSTOMER"
                }
                """;

        MvcResult createResult = mockMvc.perform(post("/api/admin/customers")
                        .header("Authorization", "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createUserRequest))
                .andExpect(status().isOk())
                .andReturn();

        String userId = extractJsonPath(createResult.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(patch("/api/admin/users/" + userId + "/active")
                        .header("Authorization", "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(patch("/api/admin/users/" + userId + "/active")
                        .header("Authorization", "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    public void testAdminViewOrders() throws Exception {
        mockMvc.perform(get("/api/admin/orders")
                        .header("Authorization", "Bearer " + getAdminToken()))
                .andExpect(status().isOk());
    }

    @Test
    public void testAdminDashboard() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + getAdminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCustomers").value(notNullValue()))
                .andExpect(jsonPath("$.totalDeliveryBoys").value(notNullValue()))
                .andExpect(jsonPath("$.activeProducts").value(notNullValue()))
                .andExpect(jsonPath("$.pendingOrders").value(notNullValue()));
    }

    @Test
    public void testAdminGetReports() throws Exception {
                mockMvc.perform(get("/api/admin/reports/daily")
                        .header("Authorization", "Bearer " + getAdminToken()))
                .andExpect(status().isOk());
    }
}

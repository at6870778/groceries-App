package com.khanago.grocery.config;

import com.khanago.grocery.catalog.Category;
import com.khanago.grocery.catalog.Product;
import com.khanago.grocery.catalog.repository.CategoryRepository;
import com.khanago.grocery.catalog.repository.ProductRepository;
import com.khanago.grocery.common.enums.RoleName;
import com.khanago.grocery.user.Role;
import com.khanago.grocery.user.User;
import com.khanago.grocery.user.repository.RoleRepository;
import com.khanago.grocery.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseInitializer {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    public void initializeDatabase() {
        log.info("🔧 Starting database initialization...");
        
        // Step 1: Create roles
        initializeRoles();
        
        // Step 2: Create categories
        initializeCategories();
        
        // Step 3: Create products
        initializeProducts();
        
        // Step 4: Create test users
        createTestUsers();
        
        log.info("✅ Database initialization completed!");
    }

    private void initializeRoles() {
        for (RoleName roleName : RoleName.values()) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                Role role = new Role();
                role.setName(roleName);
                roleRepository.save(role);
                log.info("  ✓ Created role: {}", roleName);
            }
        }
    }

    private void initializeCategories() {
        if (categoryRepository.count() > 0) {
            log.info("  ℹ Categories already exist, skipping...");
            return;
        }

        String[][] categories = {
            {"Fruits & Vegetables", "fruits-vegetables", "https://upload.wikimedia.org/wikipedia/commons/3/35/Fruit_Platter-_Seasonal_Fruits.jpg"},
            {"Dairy & Bread", "dairy-bread", "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Korb_mit_Br%C3%B6tchen.JPG/960px-Korb_mit_Br%C3%B6tchen.JPG"},
            {"Snacks", "snacks", "https://upload.wikimedia.org/wikipedia/commons/9/91/Gorp.jpg"},
            {"Beverages", "beverages", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Glass_of_tea%2C_Yogyakarta.jpg/960px-Glass_of_tea%2C_Yogyakarta.jpg"},
            {"Staples & Pulses", "staples-pulses", "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/BESAN_CHAKKI_HOMEMADE_KOTA_003.jpg/960px-BESAN_CHAKKI_HOMEMADE_KOTA_003.jpg"},
            {"Spices & Masala", "spices-masala", "https://upload.wikimedia.org/wikipedia/commons/e/e5/Chaatmasala.jpg"},
            {"Home Care", "home-care", "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Diskflaskor.JPG/960px-Diskflaskor.JPG"},
            {"Pooja & Spiritual", "pooja-spiritual", "https://upload.wikimedia.org/wikipedia/commons/f/f9/Agarwood.jpg"}
        };

        for (String[] cat : categories) {
            Category category = new Category();
            category.setName(cat[0]);
            category.setSlug(cat[1]);
            category.setImageUrl(cat[2]);
            category.setActive(true);
            categoryRepository.save(category);
            log.info("  ✓ Created category: {}", cat[0]);
        }
    }

    private void initializeProducts() {
        if (productRepository.count() > 0) {
            log.info("  ℹ Products already exist, skipping...");
            return;
        }

        java.util.Map<String, Category> categoriesMap = new java.util.HashMap<>();
        for (Category cat : categoryRepository.findAll()) {
            categoriesMap.put(cat.getSlug(), cat);
        }

        Object[][] products = {
            // Fruits & Vegetables
            {"fruits-vegetables", "Banana", "SKU-BANANA-1", "Fresh yellow bananas", "12 pcs", 55.00, 45.00, 150, "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80"},
            {"fruits-vegetables", "Tomato", "SKU-TOMATO-1", "Farm fresh tomatoes", "1 kg", 50.00, 38.00, 180, "https://images.unsplash.com/photo-1592841494218-116537a4e9f3?w=400&q=80"},
            {"fruits-vegetables", "Onion", "SKU-ONION-1", "Golden onions", "1 kg", 30.00, 25.00, 200, "https://images.unsplash.com/photo-1599599810694-b5ac4dd64b73?w=400&q=80"},
            {"fruits-vegetables", "Carrot", "SKU-CARROT-1", "Orange sweet carrots", "1 kg", 40.00, 32.00, 150, "https://images.unsplash.com/photo-1575852369052-c4db3249207d?w=400&q=80"},
            
            // Dairy & Bread
            {"dairy-bread", "Milk Toned", "SKU-MILK-1", "Daily toned milk", "1 ltr", 62.00, 59.00, 120, "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80"},
            {"dairy-bread", "Whole Wheat Bread", "SKU-BREAD-1", "Soft whole wheat loaf", "400 gm", 45.00, 39.00, 100, "https://images.unsplash.com/photo-1585238341710-4913ddc3f4be?w=400&q=80"},
            {"dairy-bread", "Butter", "SKU-BUTTER-1", "Creamy salted butter", "100 gm", 60.00, 52.00, 80, "https://images.unsplash.com/photo-1589985643862-8633ae33dcf7?w=400&q=80"},
            {"dairy-bread", "Yogurt", "SKU-YOGURT-1", "Fresh homemade yogurt", "400 gm", 35.00, 30.00, 120, "https://images.unsplash.com/photo-1488477181946-85a2138e2e1f?w=400&q=80"},
            
            // Snacks
            {"snacks", "Salted Chips", "SKU-CHIPS-1", "Crunchy potato chips", "120 gm", 40.00, 32.00, 220, "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&q=80"},
            {"snacks", "Namkeen Mix", "SKU-NAMKEEN-1", "Mixed savory snacks", "200 gm", 50.00, 42.00, 150, "https://images.unsplash.com/photo-1582519471326-672cb36fd694?w=400&q=80"},
            
            // Beverages
            {"beverages", "Orange Juice", "SKU-JUICE-1", "Fresh orange juice", "1 ltr", 120.00, 99.00, 80, "https://images.unsplash.com/photo-1600271886742-f049cd1aaada?w=400&q=80"},
            {"beverages", "Tea Powder", "SKU-TEA-1", "Premium tea leaves", "250 gm", 150.00, 129.00, 100, "https://images.unsplash.com/photo-1597318751667-7bc973cae64d?w=400&q=80"},
            
            // Staples & Pulses
            {"staples-pulses", "Toor Daal", "SKU-DAAL-1", "Premium toor dal", "1 kg", 180.00, 155.00, 140, "https://images.unsplash.com/photo-1512621539890-faba537e4558?w=400&q=80"},
            {"staples-pulses", "Chini", "SKU-CHINI-1", "Refined sugar", "1 kg", 58.00, 52.00, 210, "https://images.unsplash.com/photo-1599599810523-f12d5e68da75?w=400&q=80"},
            {"staples-pulses", "Wheat Atta", "SKU-ATTA-1", "Stone-ground atta", "5 kg", 310.00, 279.00, 95, "https://images.unsplash.com/photo-1585707072226-dfa3a60a93c0?w=400&q=80"},
            {"staples-pulses", "Basmati Rice", "SKU-RICE-1", "Aged basmati rice", "5 kg", 520.00, 469.00, 88, "https://images.unsplash.com/photo-1586521221914-63f313dc5e1b?w=400&q=80"},
            {"staples-pulses", "Moong Daal", "SKU-MOONG-1", "Green moong dal", "1 kg", 160.00, 139.00, 120, "https://images.unsplash.com/photo-1585707072708-e91b0d3b12ea?w=400&q=80"},
            
            // Spices & Masala
            {"spices-masala", "Jeera Whole", "SKU-JEERA-1", "Aromatic whole cumin seeds", "200 gm", 92.00, 79.00, 160, "https://images.unsplash.com/photo-1599599810694-b5ac4dd64b73?w=400&q=80"},
            {"spices-masala", "Turmeric Powder", "SKU-TURMERIC-1", "Pure turmeric powder", "100 gm", 75.00, 64.00, 180, "https://images.unsplash.com/photo-1585707072226-dfa3a60a93c0?w=400&q=80"},
            
            // Home Care
            {"home-care", "Surf Excel Powder", "SKU-SURF-1", "Detergent washing powder", "1 kg", 230.00, 209.00, 120, "https://images.unsplash.com/photo-1585707072708-e91b0d3b12ea?w=400&q=80"},
            {"home-care", "Dishwash Liquid", "SKU-DISHWASH-1", "Lemon dishwashing liquid", "750 ml", 135.00, 119.00, 110, "https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=400&q=80"},
            
            // Pooja & Spiritual
            {"pooja-spiritual", "Agarbatti Sandal", "SKU-AGARBATTI-1", "Sandal fragrance incense sticks", "120 sticks", 75.00, 64.00, 130, "https://images.unsplash.com/photo-1599599810694-b5ac4dd64b73?w=400&q=80"}
        };

        for (Object[] prod : products) {
            String slugKey = (String) prod[0];
            Category category = categoriesMap.get(slugKey);
            if (category == null) continue;

            Product product = new Product();
            product.setCategory(category);
            product.setName((String) prod[1]);
            product.setSku((String) prod[2]);
            product.setDescription((String) prod[3]);
            product.setUnit((String) prod[4]);
            product.setMrp(new BigDecimal(prod[5].toString()));
            product.setSellingPrice(new BigDecimal(prod[6].toString()));
            product.setStockQty((Integer) prod[7]);
            product.setImageUrl((String) prod[8]);
            product.setActive(true);
            productRepository.save(product);
        }
        log.info("  ✓ Created {} products", products.length);
    }

    private void createTestUsers() {
        // Create main test user with all roles
        String testPhone = "8860152106";
        if (userRepository.findByPhone(testPhone).isEmpty()) {
            User user = new User();
            user.setFullName("Test User - All Roles");
            user.setPhone(testPhone);
            user.setPasswordHash(passwordEncoder.encode("123456"));
            user.setActive(true);
            Set<Role> allRoles = new HashSet<>(roleRepository.findAll());
            user.setRoles(allRoles);
            userRepository.save(user);
            log.info("  ✓ Created test user: {} (roles: {})", testPhone, allRoles.size());
        }

        // Create demo users
        String[][] demoUsers = {
            {"9999999991", "Demo Admin", "ADMIN"},
            {"9999999992", "Demo Rider", "DELIVERY_BOY"},
            {"9999999993", "Demo Customer", "CUSTOMER"}
        };

        for (String[] userData : demoUsers) {
            if (userRepository.findByPhone(userData[0]).isEmpty()) {
                User user = new User();
                user.setFullName(userData[1]);
                user.setPhone(userData[0]);
                user.setPasswordHash(passwordEncoder.encode("123456"));
                user.setActive(true);
                
                Role role = roleRepository.findByName(RoleName.valueOf(userData[2]))
                        .orElse(null);
                if (role != null) {
                    user.setRoles(Set.of(role));
                    userRepository.save(user);
                    log.info("  ✓ Created demo user: {} ({})", userData[1], userData[2]);
                }
            }
        }
    }
}

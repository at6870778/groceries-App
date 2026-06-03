-- Create banners table
CREATE TABLE banners (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    image_url LONGTEXT NOT NULL,
    display_order INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    title VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default banners
INSERT INTO banners (image_url, display_order, is_active, title, description, created_at, updated_at) VALUES
('assets/banner-chai-pohaa.png', 1, TRUE, 'Chai & Poha', 'Fresh chai and poha delivery', NOW(), NOW()),
('assets/banner-foods.png', 2, TRUE, 'Foods', 'Delicious food items', NOW(), NOW()),
('assets/banner-fruits-veggies.png', 3, TRUE, 'Fresh Fruits & Veggies', 'Fresh organic produce', NOW(), NOW()),
('assets/banner-kirana.png', 4, TRUE, 'Kirana Items', 'Essential grocery items', NOW(), NOW());

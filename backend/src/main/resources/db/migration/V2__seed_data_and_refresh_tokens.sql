CREATE TABLE refresh_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    token VARCHAR(512) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_refresh_user_revoked ON refresh_tokens(user_id, revoked);
CREATE INDEX idx_refresh_expires_at ON refresh_tokens(expires_at);

INSERT INTO categories (name, slug, image_url, is_active)
VALUES
  ('Fruits & Vegetables', 'fruits-vegetables', 'https://upload.wikimedia.org/wikipedia/commons/3/35/Fruit_Platter-_Seasonal_Fruits.jpg', TRUE),
  ('Dairy & Bread', 'dairy-bread', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Korb_mit_Br%C3%B6tchen.JPG/960px-Korb_mit_Br%C3%B6tchen.JPG', TRUE),
  ('Snacks', 'snacks', 'https://upload.wikimedia.org/wikipedia/commons/9/91/Gorp.jpg', TRUE),
  ('Beverages', 'beverages', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Glass_of_tea%2C_Yogyakarta.jpg/960px-Glass_of_tea%2C_Yogyakarta.jpg', TRUE),
  ('Staples & Pulses', 'staples-pulses', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/BESAN_CHAKKI_HOMEMADE_KOTA_003.jpg/960px-BESAN_CHAKKI_HOMEMADE_KOTA_003.jpg', TRUE),
  ('Spices & Masala', 'spices-masala', 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Chaatmasala.jpg', TRUE),
  ('Home Care', 'home-care', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Diskflaskor.JPG/960px-Diskflaskor.JPG', TRUE),
  ('Pooja & Spiritual', 'pooja-spiritual', 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Agarwood.jpg', TRUE);

INSERT INTO products (category_id, name, sku, description, unit, mrp, selling_price, stock_qty, image_url, is_active)
VALUES
  ((SELECT id FROM categories WHERE slug='fruits-vegetables'), 'Banana', 'SKU-BANANA-1', 'Fresh yellow bananas', '12 pcs', 55.00, 45.00, 150, 'https://upload.wikimedia.org/wikipedia/commons/d/de/Bananavarieties.jpg', TRUE),
  ((SELECT id FROM categories WHERE slug='fruits-vegetables'), 'Tomato', 'SKU-TOMATO-1', 'Farm fresh tomatoes', '1 kg', 50.00, 38.00, 180, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/960px-Tomato_je.jpg', TRUE),
  ((SELECT id FROM categories WHERE slug='dairy-bread'), 'Milk Toned', 'SKU-MILK-1', 'Daily toned milk', '1 ltr', 62.00, 59.00, 120, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Dairy_Crest_Semi_Skimmed_Milk_Bottle.jpg/960px-Dairy_Crest_Semi_Skimmed_Milk_Bottle.jpg', TRUE),
  ((SELECT id FROM categories WHERE slug='dairy-bread'), 'Whole Wheat Bread', 'SKU-BREAD-1', 'Soft whole wheat loaf', '400 gm', 45.00, 39.00, 100, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Korb_mit_Br%C3%B6tchen.JPG/960px-Korb_mit_Br%C3%B6tchen.JPG', TRUE),
  ((SELECT id FROM categories WHERE slug='snacks'), 'Salted Chips', 'SKU-CHIPS-1', 'Crunchy potato chips', '120 gm', 40.00, 32.00, 220, 'https://upload.wikimedia.org/wikipedia/commons/8/83/French_Fries.JPG', TRUE),
  ((SELECT id FROM categories WHERE slug='beverages'), 'Orange Juice', 'SKU-JUICE-1', 'Fresh orange juice', '1 ltr', 120.00, 99.00, 80, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Oranges_-_whole-halved-segment.jpg/960px-Oranges_-_whole-halved-segment.jpg', TRUE),
  ((SELECT id FROM categories WHERE slug='staples-pulses'), 'Toor Daal', 'SKU-DAAL-1', 'Premium toor dal', '1 kg', 180.00, 155.00, 140, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/3_types_of_lentil.png/960px-3_types_of_lentil.png', TRUE),
  ((SELECT id FROM categories WHERE slug='staples-pulses'), 'Chini', 'SKU-CHINI-1', 'Refined sugar', '1 kg', 58.00, 52.00, 210, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Sucre_blanc_cassonade_complet_rapadura.jpg/960px-Sucre_blanc_cassonade_complet_rapadura.jpg', TRUE),
  ((SELECT id FROM categories WHERE slug='staples-pulses'), 'Wheat Atta', 'SKU-ATTA-1', 'Stone-ground atta', '5 kg', 310.00, 279.00, 95, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/BESAN_CHAKKI_HOMEMADE_KOTA_003.jpg/960px-BESAN_CHAKKI_HOMEMADE_KOTA_003.jpg', TRUE),
  ((SELECT id FROM categories WHERE slug='staples-pulses'), 'Basmati Rice', 'SKU-RICE-1', 'Aged basmati rice', '5 kg', 520.00, 469.00, 88, 'https://upload.wikimedia.org/wikipedia/commons/0/07/Khyma_and_Basmati_rice.jpg', TRUE),
  ((SELECT id FROM categories WHERE slug='spices-masala'), 'Jeera Whole', 'SKU-JEERA-1', 'Aromatic whole cumin seeds', '200 gm', 92.00, 79.00, 160, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Black_Cumin.jpg/960px-Black_Cumin.jpg', TRUE),
  ((SELECT id FROM categories WHERE slug='home-care'), 'Surf Excel Powder', 'SKU-SURF-1', 'Detergent washing powder', '1 kg', 230.00, 209.00, 120, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Diskflaskor.JPG/960px-Diskflaskor.JPG', TRUE),
  ((SELECT id FROM categories WHERE slug='home-care'), 'Dishwash Liquid', 'SKU-DISHWASH-1', 'Lemon dishwashing liquid', '750 ml', 135.00, 119.00, 110, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Diskflaskor.JPG/960px-Diskflaskor.JPG', TRUE),
  ((SELECT id FROM categories WHERE slug='pooja-spiritual'), 'Agarbatti Sandal', 'SKU-AGARBATTI-1', 'Sandal fragrance incense sticks', '120 sticks', 75.00, 64.00, 130, 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Incenselonghua.jpg', TRUE);

INSERT INTO users (full_name, phone, password_hash, is_active)
VALUES
  ('Demo Admin', '9999999991', '$2a$10$QvQxg0QzqTE8jJk9s5k8QOGuVEJY9PTv.Z4UEB5j9QItJ4n8gdN8u', TRUE),
  ('Demo Rider', '9999999992', '$2a$10$QvQxg0QzqTE8jJk9s5k8QOGuVEJY9PTv.Z4UEB5j9QItJ4n8gdN8u', TRUE),
  ('Demo Customer', '9999999993', '$2a$10$QvQxg0QzqTE8jJk9s5k8QOGuVEJY9PTv.Z4UEB5j9QItJ4n8gdN8u', TRUE);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.phone='9999999991' AND r.name='ADMIN';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.phone='9999999992' AND r.name='DELIVERY_BOY';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.phone='9999999993' AND r.name='CUSTOMER';

INSERT INTO addresses (user_id, label, line1, line2, city, state, postal_code, landmark, is_default)
SELECT id, 'Home', '221 Startup Street', 'Near Green Park', 'Bengaluru', 'Karnataka', '560001', 'City Center', TRUE
FROM users WHERE phone='9999999993';

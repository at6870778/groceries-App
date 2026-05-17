-- Create restaurants table (idempotent)
CREATE TABLE IF NOT EXISTS restaurants (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    name              VARCHAR(200) NOT NULL,
    cuisine_type      VARCHAR(100),
    address           VARCHAR(500),
    phone             VARCHAR(20),
    image_url         VARCHAR(500),
    rating            DECIMAL(2,1) DEFAULT 4.0,
    delivery_time_min INTEGER DEFAULT 30,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE
);

-- Add restaurant_id to products (idempotent)
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS 
     WHERE TABLE_NAME = 'products' 
     AND COLUMN_NAME = 'restaurant_id' 
     AND TABLE_SCHEMA = DATABASE()) = 0,
    'ALTER TABLE products ADD COLUMN restaurant_id BIGINT',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK constraint (idempotent)
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
     WHERE TABLE_NAME = 'products' 
     AND CONSTRAINT_NAME = 'fk_products_restaurant' 
     AND TABLE_SCHEMA = DATABASE()) = 0,
    'ALTER TABLE products ADD CONSTRAINT fk_products_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Seed restaurants (skip if already inserted)
INSERT INTO restaurants (name, cuisine_type, address, phone, rating, delivery_time_min)
SELECT 'Sharma Dhaba','North Indian','Near City Center, Main Road','9876543001',4.3,25
WHERE NOT EXISTS (SELECT 1 FROM restaurants WHERE name='Sharma Dhaba');

INSERT INTO restaurants (name, cuisine_type, address, phone, rating, delivery_time_min)
SELECT 'South Spice','South Indian','Gandhi Chowk, Station Road','9876543002',4.5,20
WHERE NOT EXISTS (SELECT 1 FROM restaurants WHERE name='South Spice');

INSERT INTO restaurants (name, cuisine_type, address, phone, rating, delivery_time_min)
SELECT 'Patel Chaat Corner','Chaat & Snacks','Old Market, MG Road','9876543003',4.2,15
WHERE NOT EXISTS (SELECT 1 FROM restaurants WHERE name='Patel Chaat Corner');

INSERT INTO restaurants (name, cuisine_type, address, phone, rating, delivery_time_min)
SELECT 'Chinese Dragon','Chinese','New Colony, Civil Lines','9876543004',4.0,35
WHERE NOT EXISTS (SELECT 1 FROM restaurants WHERE name='Chinese Dragon');

INSERT INTO restaurants (name, cuisine_type, address, phone, rating, delivery_time_min)
SELECT 'Pizza Point','Fast Food','Mall Road, Opposite Bank','9876543005',3.9,30
WHERE NOT EXISTS (SELECT 1 FROM restaurants WHERE name='Pizza Point');

-- Seed menu items (skip if SKU already exists)
INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Dal Makhani', 'SKU-DALMK-1', 'Creamy black dal cooked overnight', '1 bowl', 180.00, 160.00, 50, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='Sharma Dhaba'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-DALMK-1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Butter Naan', 'SKU-NAAN-1', 'Soft buttered naan from tandoor', '2 pcs', 60.00, 50.00, 100, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='Sharma Dhaba'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-NAAN-1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Paneer Butter Masala', 'SKU-PBM-1', 'Rich paneer in buttery tomato gravy', '1 bowl', 220.00, 190.00, 40, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='Sharma Dhaba'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-PBM-1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Masala Dosa', 'SKU-DOSA-R1', 'Crispy dosa with spiced potato filling', '1 pc', 120.00, 100.00, 60, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='South Spice'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-DOSA-R1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Idli Sambar', 'SKU-IDLI-R1', 'Soft idlis with sambar and chutney', '3 pcs', 80.00, 70.00, 80, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='South Spice'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-IDLI-R1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Medu Vada', 'SKU-VADA-R1', 'Crispy vada with coconut chutney', '2 pcs', 70.00, 60.00, 70, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='South Spice'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-VADA-R1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Pav Bhaji', 'SKU-PAVB-R1', 'Spicy veggie mash with buttered pav', '1 plate', 100.00, 90.00, 90, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='Patel Chaat Corner'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-PAVB-R1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Kulhad Chai', 'SKU-KULCHAI-1', 'Hot masala tea in earthen kulhad', '1 cup', 25.00, 20.00, 200, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='Patel Chaat Corner'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-KULCHAI-1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Aloo Tikki', 'SKU-TIKKI-R1', 'Golden potato patties with chutney', '2 pcs', 50.00, 40.00, 100, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='Patel Chaat Corner'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-TIKKI-R1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Veg Fried Rice', 'SKU-FRICE-R1', 'Wok-tossed fried rice', '1 plate', 150.00, 130.00, 50, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='Chinese Dragon'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-FRICE-R1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Paneer Chilli', 'SKU-PCHIL-R1', 'Crispy paneer in Indo-Chinese sauce', '1 plate', 180.00, 160.00, 45, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='Chinese Dragon'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-PCHIL-R1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Veg Momos', 'SKU-MOMOS-R1', 'Steamed momos with red chilli sauce', '6 pcs', 120.00, 100.00, 60, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='Chinese Dragon'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-MOMOS-R1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Margherita Pizza', 'SKU-PIZZA-R1', 'Classic cheese and tomato pizza', '7 inch', 250.00, 220.00, 30, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='Pizza Point'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-PIZZA-R1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'Veg Burger', 'SKU-BURG-R1', 'Crispy veg patty with fresh veggies', '1 pc', 120.00, 100.00, 50, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='Pizza Point'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-BURG-R1');

INSERT INTO products (category_id, restaurant_id, name, sku, description, unit, mrp, selling_price, stock_qty, is_active)
SELECT c.id, r.id, 'French Fries', 'SKU-FRIES-R1', 'Golden crispy salted fries', '1 plate', 90.00, 75.00, 80, TRUE
FROM categories c, restaurants r WHERE c.slug='snacks' AND r.name='Pizza Point'
AND NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-FRIES-R1');

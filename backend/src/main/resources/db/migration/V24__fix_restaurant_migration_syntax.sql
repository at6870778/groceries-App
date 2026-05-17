-- Fix for V11: Proper MySQL syntax for adding restaurant support to products
-- This migration fixes the syntax errors from V11 migration

-- Add restaurant_id column (using SET @sql for conditional execution)
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='products' AND COLUMN_NAME='restaurant_id') = 0,
    'ALTER TABLE products ADD COLUMN restaurant_id BIGINT',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK constraint if not exists
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_NAME='products' AND CONSTRAINT_NAME='fk_products_restaurant');

SET @sql = IF(
    @fk_exists = 0,
    'ALTER TABLE products ADD CONSTRAINT fk_products_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add missing indexes for performance optimization
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_users_phone ON users(phone);

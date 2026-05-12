-- Temporarily allow orders without a saved address (H2 + MySQL compatible)
ALTER TABLE orders ALTER COLUMN address_id BIGINT NULL;

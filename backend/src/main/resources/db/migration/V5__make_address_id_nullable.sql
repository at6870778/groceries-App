-- Allow orders without a saved address
ALTER TABLE orders MODIFY COLUMN address_id BIGINT NULL;

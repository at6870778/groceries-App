-- Create delivery charge config table
CREATE TABLE delivery_charge_config (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    charge_amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    INDEX idx_is_active (is_active),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default delivery charge (0 rupees - free delivery initially)
INSERT INTO delivery_charge_config (charge_amount, description, is_active, updated_by) 
VALUES (0, 'Free delivery - initial config', TRUE, 'system');

CREATE TABLE IF NOT EXISTS support_contact_config (
    id            BIGINT PRIMARY KEY,
    phone_number  VARCHAR(30)  NULL,
    support_email VARCHAR(120) NULL,
    privacy_email VARCHAR(120) NULL,
    address_line  VARCHAR(255) NULL,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO support_contact_config (id, phone_number, support_email, privacy_email, address_line)
SELECT 1, '+919876543210', 'support@orderkro.in', 'privacy@orderkro.in', 'Khanago, India'
WHERE NOT EXISTS (SELECT 1 FROM support_contact_config WHERE id = 1);
CREATE TABLE IF NOT EXISTS announcement (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    message    TEXT NOT NULL DEFAULT '',
    active     BOOLEAN NOT NULL DEFAULT FALSE,
    bg_color   VARCHAR(20) NOT NULL DEFAULT '#667eea',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert single singleton row
INSERT INTO announcement (id, message, active, bg_color)
SELECT 1, '', FALSE, '#667eea'
WHERE NOT EXISTS (SELECT 1 FROM announcement WHERE id = 1);

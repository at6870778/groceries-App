-- Add real admin user (phone: 8874329945)
INSERT INTO users (full_name, phone, password_hash, is_active)
SELECT 'Admin User', '8874329945', '$2a$10$QvQxg0QzqTE8jJk9s5k8QOGuVEJY9PTv.Z4UEB5j9QItJ4n8gdN8u', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE phone = '8874329945');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.phone = '8874329945' AND r.name = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur2
    JOIN users u2 ON ur2.user_id = u2.id
    WHERE u2.phone = '8874329945' AND ur2.role_id = r.id
  );

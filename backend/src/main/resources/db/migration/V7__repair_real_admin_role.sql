-- Repair real admin account: ensure 8874329945 has ADMIN role only
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM users WHERE phone = '8874329945')
  AND role_id != (SELECT id FROM roles WHERE name = 'ADMIN');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.phone = '8874329945' AND r.name = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
  );

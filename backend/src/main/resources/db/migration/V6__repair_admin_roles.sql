-- Repair demo accounts: ensure correct roles exist (idempotent)
-- Remove any wrong roles first, then re-insert the correct ones

-- 9999999991 → ADMIN only
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM users WHERE phone = '9999999991')
  AND role_id != (SELECT id FROM roles WHERE name = 'ADMIN');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.phone = '9999999991' AND r.name = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
  );

-- 9999999992 → DELIVERY_BOY only
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM users WHERE phone = '9999999992')
  AND role_id != (SELECT id FROM roles WHERE name = 'DELIVERY_BOY');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.phone = '9999999992' AND r.name = 'DELIVERY_BOY'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
  );

-- 9999999993 → CUSTOMER only
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM users WHERE phone = '9999999993')
  AND role_id != (SELECT id FROM roles WHERE name = 'CUSTOMER');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.phone = '9999999993' AND r.name = 'CUSTOMER'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
  );

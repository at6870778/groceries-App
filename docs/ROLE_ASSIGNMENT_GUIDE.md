# Role Assignment Guide - KhanaGo Database

## Overview
This guide documents how to assign roles (ADMIN, CUSTOMER, DELIVERY_BOY) to users in the database.

---

## Database Schema

### Tables Involved
- **users** - Contains user information (id, phone, full_name, etc.)
- **roles** - Contains available roles (ADMIN, CUSTOMER, DELIVERY_BOY)
- **user_roles** - Join table linking users to roles (user_id, role_id)

```sql
-- User-Role Relationship
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    ...
);

CREATE TABLE roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(30) UNIQUE NOT NULL,  -- ADMIN, CUSTOMER, DELIVERY_BOY
    ...
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

---

## How to Connect to MySQL

### On Live Server (Docker)

**Method 1: Using docker exec (Recommended)**
```bash
docker exec -it app-mysql-1 mysql -u root -p
# Password: root
```

**Method 2: Using docker compose**
```bash
docker compose exec mysql mysql -u root -p
# Password: root
```

**Method 3: Direct socket connection**
```bash
mysql -u root -p -h localhost
# This will NOT work - MySQL is in Docker container
```

---

## Step-by-Step: Assign All Roles to User

### Step 1: Connect to MySQL
```bash
docker exec -it app-mysql-1 mysql -u root -p
# Enter password: root
```

### Step 2: Select Database
```sql
USE grocery_mvp;
```

### Step 3: Check if User Exists
```sql
SELECT id, phone, full_name FROM users WHERE phone = '8874329945';
```
✅ Should return user details

### Step 4: Check Available Roles
```sql
SELECT id, name FROM roles;
```
✅ Should return 3 roles:
- 1 | ADMIN
- 2 | CUSTOMER
- 3 | DELIVERY_BOY

### Step 5: Assign All Roles to User
```sql
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.phone = '8874329945'
  AND r.name IN ('ADMIN', 'CUSTOMER', 'DELIVERY_BOY')
ON DUPLICATE KEY UPDATE user_id = user_id;
```

### Step 6: Verify Roles Assigned
```sql
SELECT u.phone, u.full_name, r.name as role
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE u.phone = '8874329945'
ORDER BY u.phone, r.name;
```

✅ Expected Output (3 rows):
```
| phone      | full_name  | role         |
|8874329945  | Admin User | ADMIN        |
|8874329945  | Admin User | CUSTOMER     |
|8874329945  | Admin User | DELIVERY_BOY |
```

---

## Assign Roles to Multiple Users

### Query: Assign all roles to multiple phone numbers
```sql
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.phone IN ('8874329945', '8090058210', '9876543210')
  AND r.name IN ('ADMIN', 'CUSTOMER', 'DELIVERY_BOY')
ON DUPLICATE KEY UPDATE user_id = user_id;
```

### Verify Multiple Users
```sql
SELECT u.phone, u.full_name, r.name as role
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE u.phone IN ('8874329945', '8090058210', '9876543210')
ORDER BY u.phone, r.name;
```

---

## Assign Specific Role to User

### Assign only ADMIN role
```sql
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.phone = '8874329945' AND r.name = 'ADMIN';
```

### Assign only CUSTOMER role
```sql
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.phone = '8874329945' AND r.name = 'CUSTOMER';
```

### Assign only DELIVERY_BOY role
```sql
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.phone = '8874329945' AND r.name = 'DELIVERY_BOY';
```

---

## Useful Queries

### Get all roles for a specific user
```sql
SELECT r.name 
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = (SELECT id FROM users WHERE phone = '8874329945');
```

### Check if user has ADMIN role
```sql
SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = (SELECT id FROM users WHERE phone = '8874329945')
    AND r.name = 'ADMIN'
) AS is_admin;
```

### Count users by role
```sql
SELECT r.name, COUNT(ur.user_id) as user_count
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
GROUP BY r.name;
```

### List all users with their roles
```sql
SELECT u.phone, u.full_name, GROUP_CONCAT(r.name SEPARATOR ', ') as roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.phone, u.full_name;
```

---

## Common Issues & Solutions

### Issue: User not found
**Error:** `0 rows affected` when assigning roles
```sql
-- Check if user exists
SELECT id, phone FROM users WHERE phone = '8874329945';
```
**Solution:** Create user first or verify phone number is correct

### Issue: Duplicate role assignment
**Query:** `ON DUPLICATE KEY UPDATE` prevents duplicate inserts
```sql
-- This won't create duplicates
INSERT INTO user_roles (user_id, role_id) VALUES (1, 1)
ON DUPLICATE KEY UPDATE user_id = user_id;
```

### Issue: Need to remove a role
```sql
DELETE FROM user_roles 
WHERE user_id = (SELECT id FROM users WHERE phone = '8874329945')
AND role_id = (SELECT id FROM roles WHERE name = 'DELIVERY_BOY');
```

---

## Example: Complete Real-World Scenario

**Scenario:** Admin user with phone 8874329945 needs all roles

```bash
# 1. Connect to MySQL
docker exec -it app-mysql-1 mysql -u root -p

# 2. Run these SQL commands
USE grocery_mvp;

-- Check user exists
SELECT id, phone, full_name FROM users WHERE phone = '8874329945';

-- Assign all roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.phone = '8874329945'
  AND r.name IN ('ADMIN', 'CUSTOMER', 'DELIVERY_BOY')
ON DUPLICATE KEY UPDATE user_id = user_id;

-- Verify
SELECT u.phone, u.full_name, r.name as role
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE u.phone = '8874329945'
ORDER BY u.phone, r.name;

EXIT;
```

---

## Live Server Connection Details

**Server:** 72.61.170.111 (Hostinger)  
**Port:** 3306  
**Database:** grocery_mvp  
**Username:** root  
**Password:** root  
**Docker Container:** app-mysql-1  

---

## Last Updated
May 19, 2026

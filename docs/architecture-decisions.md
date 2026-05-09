# Architecture Decisions (MVP Monolith)

## 1) Why Modular Monolith
- Startup MVP needs low operational complexity.
- Spring Boot modular packages keep clear boundaries and easy migration to services later.
- Shared DB transactions simplify order/cart consistency.

## 2) Module Boundaries
- `auth`: OTP simulation + JWT issue.
- `catalog`: categories/products with public browse and admin writes.
- `cart`: customer cart lifecycle.
- `order`: checkout, order history, status transitions.
- `delivery`: assignment and delivery-boy status updates.
- `admin`: dashboard, user management, reports.
- `user`: profile + addresses.

## 3) Security Choices
- Stateless JWT for API scalability.
- BCrypt for password hash storage.
- Role-based path authorization by Spring Security.
- CORS allowlist via environment variable.

## 4) Data Design Choices
- Normalized relational model with join table for roles.
- Snapshot fields in `order_items` preserve historical product details.
- Separate `delivery_assignments` enables independent tracking and handoff.
- Query-oriented composite indexes for frequent filters.

## 5) Scalability Path
- Scale app horizontally behind Nginx.
- Introduce Redis cache for catalog and session throttling.
- Add async event outbox for notifications.
- Split into microservices only after product/traffic maturity.

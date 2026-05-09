# Database Schema (Start Here)

## Why this schema
This MVP schema is normalized to reduce duplication while remaining simple for a startup monolith:
- `users` is the single source of identity.
- `roles` and `user_roles` provide flexible RBAC.
- Catalog (`categories`, `products`) is independent of ordering.
- Operational tables (`cart`, `orders`, `delivery_assignments`) are optimized for read-heavy workflows.

## ER Diagram (Text Explanation)
1. One user can have many addresses.
2. One user has one active cart; one cart has many cart items.
3. One category has many products.
4. One order belongs to one customer user and one address.
5. One order has many order items.
6. One delivery assignment maps one order to one delivery boy user.
7. Users and roles are many-to-many.

## Core Tables
- `users`
- `roles`
- `user_roles`
- `categories`
- `products`
- `addresses`
- `cart`
- `cart_items`
- `orders`
- `order_items`
- `delivery_assignments`

## Index Strategy
- Unique indexes:
  - `users.phone`
  - `roles.name`
  - `categories.slug`
  - `products.sku`
- Query indexes:
  - `products(category_id, is_active)` for category browsing.
  - `products(name)` for search bootstrap (later replace with full-text).
  - `orders(customer_id, created_at)` for order history.
  - `orders(status, created_at)` for admin queue views.
  - `delivery_assignments(delivery_boy_id, status)` for delivery app lists.

## Status Enums
Order statuses:
- `PENDING`
- `CONFIRMED`
- `PREPARING`
- `OUT_FOR_DELIVERY`
- `DELIVERED`
- `CANCELLED`

Delivery assignment statuses:
- `ASSIGNED`
- `PICKED`
- `OUT_FOR_DELIVERY`
- `DELIVERED`

## Notes for scale
- Keep MySQL InnoDB, UTF8MB4.
- Use pagination by default for list endpoints.
- Archive old order rows after growth spikes.
- Move product search to dedicated search service only after PMF.

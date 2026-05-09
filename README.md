# KhanaGo-Style Hyperlocal Grocery Delivery MVP

This workspace contains a production-oriented startup MVP built as a modular monolith.

## Tech Stack
- Backend: Java 17, Spring Boot 3, Spring Security JWT, JPA, MySQL, Maven
- Admin Panel: Angular + Angular Material (mobile-first responsive)
- Customer App: Ionic + Angular (Android-focused)
- Infra: Docker, Docker Compose, Nginx

## Project Structure
- `backend/`: secure REST backend with full modules
- `admin-panel/`: admin operations UI
- `ionic-app/`: customer mobile app shell
- `docs/`: architecture, schema, API and deployment docs
- `infra/`: reverse proxy configs

## Module Coverage
1. Authentication: OTP simulation + JWT + RBAC roles (`CUSTOMER`, `ADMIN`, `DELIVERY_BOY`)
2. Customer features: browse, search, cart, checkout COD, address, orders, tracking, profile
3. Admin features: dashboard, catalog management, order management, assignment, users, reports
4. Delivery features: assigned orders, status updates (`PICKED`, `OUT_FOR_DELIVERY`, `DELIVERED`)
5. Order status flow: `PENDING`, `CONFIRMED`, `PREPARING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`

## Start Here (Database First)
1. Read `docs/database-schema.md`
2. Check migration `backend/src/main/resources/db/migration/V1__init_schema.sql`
3. Check seeded data + refresh token migration `backend/src/main/resources/db/migration/V2__seed_data_and_refresh_tokens.sql`
4. Review decisions in `docs/architecture-decisions.md`

## Local Run (Docker)
```bash
docker compose up -d --build
```

## Backend API Docs
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI: `http://localhost:8080/v3/api-docs`

## Security Notes
- Replace JWT secret for production.
- Restrict CORS allowlist.
- Use HTTPS only in production.

## Phase 2 Enhancements Included
- OTP request throttling and cooldown windows.
- Refresh token rotation endpoint and persistent token store.
- Seed demo users, categories, and products for quick testing.
- Admin CRUD flows for category/product and user activation.
- Admin chart-ready daily report endpoint.

## Phase 3 Enhancements Included
- Backend integration tests for auth and cart-checkout lifecycle.
- Production bug fixes discovered by integration tests (lazy loading + missing transaction).
- Angular Material table/dialog/snackbar workflows for admin management screens.
- Ionic delivery mode with rider login and assigned-order status updates.

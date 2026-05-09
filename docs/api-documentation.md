# REST API Documentation

Base URL: `/api`

## Authentication
### POST `/auth/request-otp`
Request:
```json
{ "phone": "9876543210" }
```
Response:
```json
{ "message": "OTP generated", "data": "OTP sent (simulation only). Use 123456." }
```

### POST `/auth/verify-otp`
Request:
```json
{ "phone": "9876543210", "otp": "123456", "fullName": "Ravi", "role": "CUSTOMER" }
```
Response:
```json
{
  "message": "Authenticated successfully",
  "data": {
    "token": "<jwt>",
    "refreshToken": "<refresh-jwt>",
    "userId": 10,
    "fullName": "Ravi",
    "phone": "9876543210",
    "roles": ["CUSTOMER"]
  }
}
```

### POST `/auth/refresh`
Request:
```json
{ "refreshToken": "<refresh-jwt>" }
```
Response returns new access and refresh tokens.

## Catalog
### GET `/catalog/categories`
### GET `/catalog/products?page=0&size=20&categoryId=1&query=milk`
### GET `/catalog/products/{id}`

## Customer
### GET `/customer/profile`
### GET `/customer/profile/addresses`
### POST `/customer/profile/addresses`
### PUT `/customer/profile/addresses/{id}`
### DELETE `/customer/profile/addresses/{id}`

### GET `/customer/cart`
### POST `/customer/cart/items`
Request:
```json
{ "productId": 12, "quantity": 2 }
```
### DELETE `/customer/cart/items/{productId}`

### POST `/customer/orders/checkout`
Request:
```json
{ "addressId": 3, "notes": "Ring bell" }
```
### GET `/customer/orders?page=0&size=10`
### GET `/customer/orders/{orderId}`

## Admin
### GET `/admin/dashboard`
### GET `/admin/customers?page=0&size=20`
### GET `/admin/delivery-boys?page=0&size=20`
### GET `/admin/reports`

### Catalog Management
- POST `/admin/catalog/categories`
- POST `/admin/catalog/products`
- PUT `/admin/catalog/products/{id}`
- DELETE `/admin/catalog/products/{id}`

### Order Management
- GET `/admin/orders?page=0&size=20&status=PENDING`
- PATCH `/admin/orders/{orderId}/status`
- POST `/admin/orders/{orderId}/assign`

## Delivery Boy
### GET `/delivery/orders`
### PATCH `/delivery/assignments/{assignmentId}/status`
Status body:
```json
{ "status": "OUT_FOR_DELIVERY" }
```

## HTTP Status Guide
- `200` success read/update
- `201` can be used for explicit create extensions
- `400` validation or business rule failure
- `401` missing/invalid token
- `403` role not allowed
- `404` resource not found
- `500` unexpected server error

## Seeded Demo Accounts (via Flyway V2)
- Admin: phone `9999999991`, OTP `123456`, role `ADMIN`
- Delivery boy: phone `9999999992`, OTP `123456`, role `DELIVERY_BOY`
- Customer: phone `9999999993`, OTP `123456`, role `CUSTOMER`

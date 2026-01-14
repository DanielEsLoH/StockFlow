# StockFlow API Documentation

This document provides a comprehensive reference for all StockFlow API endpoints.

## Base URL

```
Development: http://localhost:3000
Production: https://api.yourdomain.com
```

## Interactive Documentation

Swagger UI is available at `/api/docs` when the server is running.

## Authentication

Most endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Obtaining Tokens

1. **Login** with email/password to receive access and refresh tokens
2. **Access tokens** expire in 15 minutes (configurable)
3. **Refresh tokens** expire in 7 days (configurable)
4. Use the **refresh endpoint** to obtain new access tokens

## Response Format

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2025-01-13T10:30:00.000Z",
  "path": "/api/products"
}
```

---

## Authentication Endpoints

### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "tenantId": "tenant-uuid"
}
```

**Response:** `201 Created`
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "status": "PENDING"
}
```

---

### POST /auth/login

Authenticate and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN",
    "tenantId": "tenant-uuid"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### POST /auth/refresh

Refresh the access token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### POST /auth/logout

Logout and invalidate tokens.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

## Users Endpoints

### GET /users

List all users in the tenant. **Requires:** ADMIN or MANAGER role.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10, max: 100) |
| search | string | Search by name or email |
| role | string | Filter by role |
| status | string | Filter by status |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "EMPLOYEE",
      "status": "ACTIVE",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "meta": { "total": 50, "page": 1, "limit": 10, "totalPages": 5 }
}
```

---

### GET /users/:id

Get a specific user. **Requires:** ADMIN, MANAGER, or own profile.

**Response:** `200 OK`

---

### POST /users

Create a new user. **Requires:** ADMIN role.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "EMPLOYEE",
  "phone": "+1234567890"
}
```

---

### PATCH /users/:id

Update a user. **Requires:** ADMIN or own profile.

---

### DELETE /users/:id

Delete a user. **Requires:** ADMIN role.

---

### PATCH /users/:id/change-password

Change user password.

**Request Body:**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newSecurePassword123"
}
```

---

### PATCH /users/:id/approve

Approve a pending user. **Requires:** ADMIN role.

---

### PATCH /users/:id/suspend

Suspend a user. **Requires:** ADMIN role.

---

## Products Endpoints

### GET /products

List all products with filtering and pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| search | string | Search by name, SKU, barcode |
| categoryId | uuid | Filter by category |
| status | string | Filter by status |
| lowStock | boolean | Show only low-stock items |

---

### GET /products/:id

Get a specific product.

---

### GET /products/low-stock

List products below minimum stock level.

---

### GET /products/search

Search products by name, SKU, or barcode.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query |

---

### POST /products

Create a new product. **Requires:** ADMIN or MANAGER role.

**Request Body:**
```json
{
  "sku": "SKU-001",
  "name": "Wireless Headphones",
  "description": "High-quality wireless headphones",
  "categoryId": "category-uuid",
  "costPrice": 50.00,
  "salePrice": 79.99,
  "taxRate": 19,
  "stock": 100,
  "minStock": 10,
  "barcode": "7501234567890",
  "brand": "Sony",
  "unit": "UND"
}
```

---

### PATCH /products/:id

Update a product. **Requires:** ADMIN or MANAGER role.

---

### DELETE /products/:id

Delete a product. **Requires:** ADMIN role.

---

### PATCH /products/:id/stock

Adjust product stock manually. **Requires:** ADMIN or MANAGER role.

**Request Body:**
```json
{
  "quantity": 10,
  "type": "ADJUSTMENT",
  "reason": "Physical inventory correction",
  "notes": "Found 10 additional units"
}
```

---

## Categories Endpoints

### GET /categories

List all categories.

---

### GET /categories/:id

Get a specific category.

---

### POST /categories

Create a new category. **Requires:** ADMIN or MANAGER role.

**Request Body:**
```json
{
  "name": "Electronics",
  "description": "Electronic devices and accessories",
  "color": "#3b82f6"
}
```

---

### PATCH /categories/:id

Update a category. **Requires:** ADMIN or MANAGER role.

---

### DELETE /categories/:id

Delete a category. **Requires:** ADMIN role. Fails if products exist.

---

## Warehouses Endpoints

### GET /warehouses

List all warehouses.

---

### GET /warehouses/:id

Get warehouse details with stock summary.

---

### GET /warehouses/:id/stock

Get detailed stock list for a warehouse.

---

### POST /warehouses

Create a new warehouse. **Requires:** ADMIN role.

**Request Body:**
```json
{
  "name": "Main Warehouse",
  "code": "WH-001",
  "address": "123 Storage St",
  "city": "New York",
  "phone": "+1234567890",
  "isMain": true
}
```

---

### PATCH /warehouses/:id

Update a warehouse. **Requires:** ADMIN role.

---

### DELETE /warehouses/:id

Delete a warehouse. **Requires:** ADMIN role. Fails if stock exists.

---

### POST /warehouses/transfer

Transfer stock between warehouses. **Requires:** ADMIN or MANAGER role.

**Request Body:**
```json
{
  "fromWarehouseId": "source-uuid",
  "toWarehouseId": "destination-uuid",
  "productId": "product-uuid",
  "quantity": 10,
  "notes": "Restocking branch location"
}
```

---

## Customers Endpoints

### GET /customers

List all customers with filtering.

---

### GET /customers/:id

Get customer details with invoice history.

---

### GET /customers/search

Search customers by name, document, or email.

---

### POST /customers

Create a new customer.

**Request Body:**
```json
{
  "documentType": "CC",
  "documentNumber": "1234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "address": "456 Customer Ave",
  "city": "Los Angeles",
  "businessName": "Doe Enterprises",
  "taxId": "TAX123456"
}
```

---

### PATCH /customers/:id

Update a customer.

---

### DELETE /customers/:id

Delete a customer. Fails if invoices exist.

---

## Invoices Endpoints

### GET /invoices

List all invoices with filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | DRAFT, PENDING, SENT, CANCELLED |
| paymentStatus | string | UNPAID, PARTIALLY_PAID, PAID |
| customerId | uuid | Filter by customer |
| fromDate | date | Start date |
| toDate | date | End date |

---

### GET /invoices/:id

Get invoice with items and payments.

---

### GET /invoices/:id/pdf

Download invoice as PDF.

---

### POST /invoices

Create a new invoice.

**Request Body:**
```json
{
  "customerId": "customer-uuid",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 2,
      "unitPrice": 100.00,
      "taxRate": 19,
      "discount": 0
    }
  ],
  "dueDate": "2025-02-15",
  "notes": "Thank you for your purchase"
}
```

---

### PATCH /invoices/:id

Update a DRAFT invoice.

---

### DELETE /invoices/:id

Delete a DRAFT invoice.

---

### PATCH /invoices/:id/send

Send invoice (change status to SENT).

---

### PATCH /invoices/:id/cancel

Cancel an invoice.

---

### POST /invoices/:id/items

Add item to DRAFT invoice.

---

### PATCH /invoices/:id/items/:itemId

Update item in DRAFT invoice.

---

### DELETE /invoices/:id/items/:itemId

Remove item from DRAFT invoice.

---

## Payments Endpoints

### GET /payments

List all payments.

---

### GET /payments/:id

Get payment details.

---

### GET /invoices/:invoiceId/payments

Get payments for a specific invoice.

---

### POST /payments

Record a payment.

**Request Body:**
```json
{
  "invoiceId": "invoice-uuid",
  "amount": 50000,
  "method": "CASH",
  "reference": "REC-001",
  "notes": "Partial payment",
  "paymentDate": "2025-01-15"
}
```

**Payment Methods:** `CASH`, `CARD`, `TRANSFER`, `CHECK`, `OTHER`

---

### DELETE /payments/:id

Delete a payment. **Requires:** ADMIN role.

---

## Stock Movements Endpoints

### GET /stock-movements

List all stock movements with filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| productId | uuid | Filter by product |
| warehouseId | uuid | Filter by warehouse |
| type | string | PURCHASE, SALE, TRANSFER, ADJUSTMENT, RETURN |
| fromDate | date | Start date |
| toDate | date | End date |

---

### GET /stock-movements/:id

Get movement details.

---

### GET /products/:productId/movements

Get movement history for a product.

---

### GET /warehouses/:warehouseId/movements

Get movements for a warehouse.

---

### POST /stock-movements

Create manual stock adjustment.

**Request Body:**
```json
{
  "productId": "product-uuid",
  "warehouseId": "warehouse-uuid",
  "type": "ADJUSTMENT",
  "quantity": 10,
  "reason": "Physical count correction",
  "notes": "Annual inventory audit"
}
```

---

## Dashboard Endpoints

### GET /dashboard

Get dashboard metrics and analytics.

**Response:** `200 OK`
```json
{
  "sales": {
    "today": 125000,
    "thisWeek": 850000,
    "thisMonth": 3500000,
    "growth": 12.5
  },
  "products": {
    "total": 234,
    "lowStock": 12,
    "outOfStock": 3,
    "topSelling": [...]
  },
  "invoices": {
    "pending": 15,
    "overdue": 3,
    "paid": 145
  },
  "customers": {
    "total": 89,
    "new": 12
  },
  "charts": {
    "salesByDay": [...],
    "topProducts": [...],
    "salesByCategory": [...]
  }
}
```

---

## Reports Endpoints

### GET /reports/sales

Generate sales report. **Requires:** PRO plan or higher.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| format | string | `pdf` or `excel` |
| fromDate | date | Start date (required) |
| toDate | date | End date (required) |
| categoryId | uuid | Filter by category |

---

### GET /reports/inventory

Generate inventory report.

---

### GET /reports/customers

Generate customers report.

---

## Notifications Endpoints

### GET /notifications

List notifications for current user.

---

### GET /notifications/:id

Get notification details.

---

### GET /notifications/unread-count

Get count of unread notifications.

---

### PATCH /notifications/:id/read

Mark notification as read.

---

### PATCH /notifications/mark-all-read

Mark all notifications as read.

---

### DELETE /notifications/:id

Delete a notification.

---

## Subscriptions Endpoints

### POST /subscriptions/create-checkout

Create Stripe checkout session.

**Request Body:**
```json
{
  "plan": "PRO"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

---

### POST /subscriptions/portal

Create Stripe customer portal session.

---

### GET /subscriptions/status

Get current subscription status.

---

### POST /webhooks/stripe

Stripe webhook endpoint (used by Stripe, not called directly).

---

## Audit Logs Endpoints

### GET /audit-logs

List audit logs. **Requires:** ADMIN role.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | uuid | Filter by user |
| action | string | Filter by action type |
| resource | string | Filter by resource type |
| fromDate | date | Start date |
| toDate | date | End date |

---

## Upload Endpoints

### POST /upload/product-image

Upload a product image.

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Description |
|-------|------|-------------|
| file | file | Image file (jpg, png, gif, max 5MB) |

**Response:**
```json
{
  "url": "/uploads/products/product-123456.jpg"
}
```

---

### DELETE /upload/product-image/:filename

Delete a product image.

---

## Health Endpoints

### GET /

Health check endpoint.

**Response:** `200 OK`
```text
Hello World!
```

---

### GET /test-pagination

Test pagination validation.

---

### POST /test-validation

Test body validation.

---

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate entry) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Rate Limiting

API requests are rate-limited using Arcjet:

- **General endpoints:** 100 requests per minute
- **Auth endpoints:** 10 requests per minute (login, register)
- **Report generation:** 10 requests per minute

Exceeding limits returns `429 Too Many Requests`.
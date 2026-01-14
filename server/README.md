# StockFlow Backend

Multi-Tenant SaaS Inventory and Invoicing System built with NestJS.

## Features

- **Multi-tenancy** with Row-Level Security - complete data isolation between tenants
- **JWT Authentication** with access and refresh tokens
- **RBAC** (Role-Based Access Control) - 4 roles: SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE
- **Product Management** - SKU, categories, stock levels, low-stock alerts
- **Inventory Control** - Multi-warehouse support, stock transfers, movement tracking
- **Customer Management** - Customer profiles with purchase history
- **Invoicing System** - Invoice generation, PDF export, payment tracking
- **Dashboard Analytics** - Sales metrics, top products, revenue charts
- **Reports** - PDF/Excel export for sales, inventory, and customer reports
- **Subscriptions** - Stripe integration with tiered plans (FREE, BASIC, PRO, ENTERPRISE)
- **Email Notifications** - Brevo (Sendinblue) integration for transactional emails
- **Audit Logging** - Complete activity tracking for compliance
- **Rate Limiting** - Arcjet integration for API protection

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 11.x | Backend framework |
| TypeScript | 5.7+ | Type-safe JavaScript |
| Prisma | 7.x | Database ORM |
| PostgreSQL | 16+ | Primary database |
| JWT | - | Authentication |
| Stripe | - | Payment processing |
| Brevo | - | Email service |
| Arcjet | - | Rate limiting & security |
| Jest | 30.x | Testing framework |

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database (optional)
npm run prisma:seed

# Start development server
npm run start:dev
```

The server will be available at `http://localhost:3000`.

## API Documentation

Interactive Swagger documentation is available at:
```
http://localhost:3000/api/docs
```

For detailed API documentation, see [docs/API.md](docs/API.md).

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to dist/ |
| `npm run start:prod` | Start production server |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Generate test coverage report |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run lint` | Run ESLint with auto-fix |
| `npm run format` | Run Prettier formatting |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio GUI |
| `npm run prisma:seed` | Seed database with test data |

## Project Structure

```
server/
├── src/
│   ├── app.module.ts          # Root application module
│   ├── main.ts                # Application entry point
│   ├── auth/                  # Authentication & authorization
│   │   ├── strategies/        # JWT strategies
│   │   ├── guards/            # Auth guards (JWT, Roles)
│   │   └── dto/               # Login, Register DTOs
│   ├── users/                 # User management
│   ├── products/              # Product CRUD & stock
│   ├── categories/            # Product categories
│   ├── warehouses/            # Multi-warehouse management
│   ├── customers/             # Customer management
│   ├── invoices/              # Invoice generation
│   ├── payments/              # Payment recording
│   ├── stock-movements/       # Inventory tracking
│   ├── dashboard/             # Analytics & metrics
│   ├── reports/               # PDF/Excel reports
│   ├── notifications/         # Email notifications
│   ├── subscriptions/         # Stripe billing
│   ├── audit-logs/            # Activity logging
│   ├── upload/                # File uploads
│   ├── common/                # Shared utilities
│   │   ├── decorators/        # Custom decorators
│   │   ├── filters/           # Exception filters
│   │   ├── guards/            # Shared guards
│   │   ├── interceptors/      # HTTP interceptors
│   │   ├── middleware/        # Express middleware
│   │   └── pipes/             # Validation pipes
│   ├── config/                # Environment configuration
│   └── prisma/                # Database service
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Migration files
│   └── seed.ts                # Seed script
├── test/                      # E2E tests
├── uploads/                   # Uploaded files
└── docs/                      # Documentation
    ├── API.md                 # API reference
    ├── DEPLOYMENT.md          # Deployment guide
    └── TESTING.md             # Testing guide
```

## Database Models

| Model | Description |
|-------|-------------|
| Tenant | Organization/company (multi-tenant root) |
| User | User accounts with roles |
| Category | Product categories |
| Product | Products with SKU, pricing, stock |
| Warehouse | Storage locations |
| WarehouseStock | Stock per warehouse |
| StockMovement | Inventory movement history |
| Customer | Customer profiles |
| Invoice | Sales invoices |
| InvoiceItem | Invoice line items |
| Payment | Payment records |
| AuditLog | Activity audit trail |

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/stockflow

# JWT Authentication
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Email (Brevo)
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=StockFlow

# Stripe (Optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Security (Arcjet)
ARCJET_KEY=your-arcjet-key
ARCJET_ENABLED=true
```

## Testing

```bash
# Run all unit tests
npm run test

# Run tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e

# Run specific test file
npx jest path/to/file.spec.ts
```

Current test coverage: **98%+** across all modules.

For detailed testing documentation, see [docs/TESTING.md](docs/TESTING.md).

## Deployment

For deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## API Endpoints Summary

| Module | Endpoints | Description |
|--------|-----------|-------------|
| Auth | 4 | Login, register, refresh, logout |
| Users | 8 | CRUD, password change, status management |
| Products | 7 | CRUD, stock adjustment, search |
| Categories | 5 | CRUD operations |
| Warehouses | 7 | CRUD, stock transfer |
| Customers | 6 | CRUD, search |
| Invoices | 10 | CRUD, send, cancel, PDF, items |
| Payments | 5 | CRUD, invoice payments |
| Stock Movements | 5 | CRUD, product/warehouse history |
| Dashboard | 1 | Analytics metrics |
| Reports | 4 | Sales, inventory, customer reports |
| Notifications | 6 | CRUD, mark read |
| Subscriptions | 4 | Checkout, portal, status, webhooks |
| Audit Logs | 2 | List, filter |
| Upload | 2 | Product images |
| Health | 3 | Health check, test endpoints |

**Total: 75+ API endpoints**

## Subscription Plans

| Feature | FREE | BASIC | PRO | ENTERPRISE |
|---------|------|-------|-----|------------|
| Users | 2 | 5 | 20 | Unlimited |
| Products | 100 | 1,000 | Unlimited | Unlimited |
| Warehouses | 1 | 3 | 10 | Unlimited |
| Monthly Invoices | 50 | 500 | Unlimited | Unlimited |
| PDF Reports | No | Yes | Yes | Yes |
| Email Notifications | No | Yes | Yes | Yes |
| API Access | No | No | Yes | Yes |
| Priority Support | No | No | No | Yes |

## Contributing

1. Follow the existing code patterns and conventions
2. Write tests for new features (maintain 95%+ coverage)
3. Use conventional commits for commit messages
4. Run `npm run lint` and `npm run format` before committing

## License

Proprietary - All rights reserved.
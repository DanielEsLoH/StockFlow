# StockFlow Server

NestJS backend for the StockFlow multi-tenant inventory and invoicing platform.

For complete documentation, see the main [README](../README.md).

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server (port 3000)
npm run start:dev
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Development server with hot reload |
| `npm run build` | Compile TypeScript to dist/ |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:cov` | Generate test coverage report |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run prisma:studio` | Open Prisma Studio |

## Directory Structure

```
src/
├── auth/           # Authentication module (JWT, guards, strategies)
├── common/         # Shared utilities (decorators, filters, guards, pipes)
├── config/         # Environment configuration
├── prisma/         # Database service and multi-tenant helpers
├── app.module.ts   # Root application module
└── main.ts         # Application entry point

prisma/
├── schema.prisma   # Database schema
├── migrations/     # Database migrations
└── seed.ts         # Seed script

test/
└── *.e2e-spec.ts   # End-to-end tests
```

## Environment Variables

See `.env.example` for required configuration. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing access tokens
- `JWT_REFRESH_SECRET` - Secret for signing refresh tokens
- `PORT` - Server port (default: 3000)
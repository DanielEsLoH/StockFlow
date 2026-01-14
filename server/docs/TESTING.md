# Testing Guide

This guide covers testing strategies, patterns, and best practices for the StockFlow backend.

## Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Unit Testing](#unit-testing)
- [E2E Testing](#e2e-testing)
- [Coverage Reports](#coverage-reports)
- [Mocking Strategies](#mocking-strategies)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)

---

## Overview

StockFlow uses Jest as its testing framework with the following test types:

| Type | Location | Purpose |
|------|----------|---------|
| Unit Tests | `src/**/*.spec.ts` | Test individual components in isolation |
| E2E Tests | `test/*.e2e-spec.ts` | Test complete API flows |

### Current Coverage

| Metric | Coverage |
|--------|----------|
| Statements | 98%+ |
| Branches | 87%+ |
| Functions | 98%+ |
| Lines | 98%+ |

---

## Running Tests

### All Unit Tests

```bash
npm run test
```

### Watch Mode

```bash
npm run test:watch
```

### Single Test File

```bash
npx jest src/products/products.service.spec.ts
```

### Test by Pattern

```bash
npx jest --testNamePattern="should create a product"
```

### E2E Tests

```bash
npm run test:e2e
```

### Coverage Report

```bash
npm run test:cov
```

### Coverage with HTML Report

```bash
npm run test:cov:open
```

---

## Test Structure

### Unit Test File Structure

```typescript
// products.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  // Setup before each test
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // Reset mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Group related tests
  describe('create', () => {
    it('should create a product', async () => {
      // Arrange
      const dto = { name: 'Test Product', sku: 'SKU-001' };

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result.name).toBe(dto.name);
    });

    it('should throw error for duplicate SKU', async () => {
      // Test error cases
    });
  });
});
```

### E2E Test File Structure

```typescript
// products.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Products (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'password' });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /products', () => {
    it('should return products list', () => {
      return request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/products')
        .expect(401);
    });
  });
});
```

---

## Unit Testing

### Testing Services

```typescript
describe('ProductsService', () => {
  describe('findAll', () => {
    it('should return paginated products', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1' },
        { id: '2', name: 'Product 2' },
      ];

      jest.spyOn(prisma.product, 'findMany').mockResolvedValue(mockProducts);
      jest.spyOn(prisma.product, 'count').mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual(mockProducts);
      expect(result.meta.total).toBe(2);
      expect(prisma.product.findMany).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create and return product', async () => {
      const dto = { name: 'New Product', sku: 'SKU-001', costPrice: 100, salePrice: 150 };
      const expected = { id: '1', ...dto };

      jest.spyOn(prisma.product, 'create').mockResolvedValue(expected);

      const result = await service.create(dto);

      expect(result).toEqual(expected);
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining(dto),
      });
    });

    it('should throw ConflictException for duplicate SKU', async () => {
      const dto = { name: 'Product', sku: 'EXISTING-SKU' };

      jest.spyOn(prisma.product, 'create').mockRejectedValue({
        code: 'P2002',
        meta: { target: ['sku'] },
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });
});
```

### Testing Controllers

```typescript
describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('should call service with filters', async () => {
      const filters = { page: 1, limit: 10, search: 'test' };
      const expected = { data: [], meta: { total: 0 } };

      jest.spyOn(service, 'findAll').mockResolvedValue(expected);

      const result = await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(expected);
    });
  });
});
```

### Testing Guards

```typescript
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    it('should return user when valid', () => {
      const user = { id: '1', email: 'test@test.com' };
      const result = guard.handleRequest(null, user, null);
      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException when no user', () => {
      expect(() => guard.handleRequest(null, null, null))
        .toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when error', () => {
      expect(() => guard.handleRequest(new Error(), null, null))
        .toThrow(UnauthorizedException);
    });
  });
});
```

### Testing Filters

```typescript
describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('should format HttpException response', () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const mockRequest = { url: '/test' };
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;

    const exception = new BadRequestException('Test error');

    filter.catch(exception, mockContext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Test error',
        path: '/test',
      }),
    );
  });
});
```

---

## E2E Testing

### Authentication Flow

```typescript
describe('Auth (e2e)', () => {
  it('should complete login flow', async () => {
    // 1. Register user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'new@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);

    // 2. Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'new@test.com',
        password: 'password123',
      })
      .expect(200);

    expect(loginRes.body).toHaveProperty('accessToken');
    expect(loginRes.body).toHaveProperty('refreshToken');

    // 3. Access protected route
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200);
  });
});
```

### CRUD Operations

```typescript
describe('Products CRUD (e2e)', () => {
  let productId: string;

  it('POST /products - create', async () => {
    const res = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'E2E Test Product',
        sku: 'E2E-001',
        costPrice: 100,
        salePrice: 150,
      })
      .expect(201);

    productId = res.body.id;
    expect(res.body.name).toBe('E2E Test Product');
  });

  it('GET /products/:id - read', async () => {
    const res = await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe(productId);
  });

  it('PATCH /products/:id - update', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' })
      .expect(200);

    expect(res.body.name).toBe('Updated Name');
  });

  it('DELETE /products/:id - delete', async () => {
    await request(app.getHttpServer())
      .delete(`/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});
```

### Multi-Tenancy Tests

```typescript
describe('Multi-tenancy (e2e)', () => {
  it('should isolate tenant data', async () => {
    // Create product as Tenant A
    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send({ name: 'Tenant A Product', sku: 'A-001' })
      .expect(201);

    // Tenant B should not see Tenant A's products
    const res = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .expect(200);

    const productNames = res.body.data.map((p) => p.name);
    expect(productNames).not.toContain('Tenant A Product');
  });
});
```

---

## Coverage Reports

### Viewing Reports

After running `npm run test:cov`, find reports in:

| Report | Location |
|--------|----------|
| Terminal | stdout |
| HTML | `coverage/index.html` |
| LCOV | `coverage/lcov.info` |
| JSON | `coverage/coverage-final.json` |

### Coverage Thresholds

Configured in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  './src/auth/': {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85,
  },
}
```

### What's Included

Coverage is collected for:
- Services (`*.service.ts`)
- Controllers (`*.controller.ts`)
- Guards (`*.guard.ts`)
- Strategies (`*.strategy.ts`)
- Interceptors (`*.interceptor.ts`)
- Filters (`*.filter.ts`)
- Middleware (`*.middleware.ts`)
- Pipes (`*.pipe.ts`)

### What's Excluded

- Module definitions (`*.module.ts`)
- Entry point (`main.ts`)
- Interfaces (`*.interface.ts`)
- DTOs (`*.dto.ts`)
- Entities (`*.entity.ts`)
- Test files (`*.spec.ts`)

---

## Mocking Strategies

### Prisma Service Mock

```typescript
const mockPrismaService = {
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrismaService)),
};
```

### Request Context Mock

```typescript
const mockRequest = {
  user: {
    userId: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@test.com',
    role: 'ADMIN',
  },
};

// For REQUEST scope providers
{
  provide: REQUEST,
  useValue: mockRequest,
}
```

### Config Service Mock

```typescript
const mockConfigService = {
  get: jest.fn((key: string) => {
    const config = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRATION: '15m',
    };
    return config[key];
  }),
};
```

### External Service Mocks

```typescript
// Stripe mock
const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/...' }),
    },
  },
  customers: {
    create: jest.fn().mockResolvedValue({ id: 'cus_123' }),
  },
};

// Mail service mock
const mockMailService = {
  send: jest.fn().mockResolvedValue(true),
};
```

---

## Best Practices

### 1. Follow AAA Pattern

```typescript
it('should calculate total correctly', () => {
  // Arrange
  const items = [{ price: 100, quantity: 2 }];

  // Act
  const total = service.calculateTotal(items);

  // Assert
  expect(total).toBe(200);
});
```

### 2. Test One Thing Per Test

```typescript
// Good
it('should create product', async () => { /* ... */ });
it('should throw on duplicate SKU', async () => { /* ... */ });

// Bad
it('should create product and throw on duplicate', async () => { /* ... */ });
```

### 3. Use Descriptive Names

```typescript
// Good
it('should return 401 when token is expired');
it('should update payment status to PAID when fully paid');

// Bad
it('test1');
it('should work');
```

### 4. Mock External Dependencies

```typescript
// Don't hit real databases or APIs in unit tests
jest.spyOn(prisma.product, 'create').mockResolvedValue(mockProduct);
jest.spyOn(stripeService, 'createCheckout').mockResolvedValue({ url: '...' });
```

### 5. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await app.close();
});
```

### 6. Test Edge Cases

```typescript
describe('findAll', () => {
  it('should return empty array when no products');
  it('should handle pagination at boundary');
  it('should handle special characters in search');
  it('should handle invalid UUID gracefully');
});
```

### 7. Use Test Fixtures

```typescript
// fixtures/products.ts
export const mockProduct = {
  id: 'prod-123',
  name: 'Test Product',
  sku: 'TEST-001',
  costPrice: 100,
  salePrice: 150,
  stock: 10,
};

export const mockProductList = [
  mockProduct,
  { ...mockProduct, id: 'prod-456', sku: 'TEST-002' },
];
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: stockflow_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: ./server

      - name: Generate Prisma client
        run: npx prisma generate
        working-directory: ./server

      - name: Run migrations
        run: npx prisma migrate deploy
        working-directory: ./server
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/stockflow_test

      - name: Run unit tests
        run: npm run test:cov
        working-directory: ./server

      - name: Run E2E tests
        run: npm run test:e2e
        working-directory: ./server
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/stockflow_test

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./server/coverage/lcov.info
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
cd server && npm run test -- --passWithNoTests --bail
```

---

## Debugging Tests

### Run Single Test in Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand path/to/test.spec.ts
```

### Verbose Output

```bash
npm run test -- --verbose
```

### Show Console Logs

```bash
npm run test -- --silent=false
```

### Find Slow Tests

```bash
npm run test -- --detectOpenHandles --forceExit
```
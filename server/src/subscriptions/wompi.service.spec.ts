import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { WompiService } from './wompi.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Response-like object that satisfies the fetch contract.
 */
function mockFetchResponse(
  body: unknown,
  options: { ok?: boolean; status?: number; statusText?: string } = {},
) {
  const { ok = true, status = 200, statusText = 'OK' } = options;
  return {
    ok,
    status,
    statusText,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('WompiService', () => {
  let service: WompiService;
  let configService: ConfigService;

  // Config values used across the suite
  const TEST_PUBLIC_KEY = 'pub_test_abc123';
  const TEST_PRIVATE_KEY = 'prv_test_xyz789';
  const TEST_EVENT_SECRET = 'test_event_secret';
  const TEST_INTEGRITY_SECRET = 'test_integrity_secret';

  const SANDBOX_BASE_URL = 'https://sandbox.wompi.co/v1';

  // Reusable mock data -------------------------------------------------------

  const mockMerchantInfo = {
    id: 12345,
    name: 'Test Merchant',
    legal_name: 'Test Merchant SAS',
    presigned_acceptance: {
      acceptance_token: 'acc_tok_123',
      permalink: 'https://wompi.co/acceptance',
      type: 'END_USER_POLICY',
    },
    presigned_personal_data_auth: {
      acceptance_token: 'personal_tok_456',
      permalink: 'https://wompi.co/personal',
      type: 'PERSONAL_DATA_AUTH',
    },
  };

  const mockPaymentSource = {
    id: 9999,
    type: 'CARD',
    status: 'AVAILABLE',
    customer_email: 'user@example.com',
  };

  const mockTransaction = {
    id: 'txn-001',
    status: 'APPROVED' as const,
    reference: 'ref-abc',
    amount_in_cents: 5000000,
    currency: 'COP',
    payment_method_type: 'CARD',
    customer_email: 'user@example.com',
    created_at: '2026-01-15T10:00:00.000Z',
    finalized_at: '2026-01-15T10:01:00.000Z',
  };

  // -------------------------------------------------------------------------
  // Module setup
  // -------------------------------------------------------------------------

  beforeEach(async () => {
    // Mock global fetch before each test
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WompiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                WOMPI_PUBLIC_KEY: TEST_PUBLIC_KEY,
                WOMPI_PRIVATE_KEY: TEST_PRIVATE_KEY,
                WOMPI_EVENT_SECRET: TEST_EVENT_SECRET,
                WOMPI_INTEGRITY_SECRET: TEST_INTEGRITY_SECRET,
                FRONTEND_URL: 'https://stockflow.com.co',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WompiService>(WompiService);
    configService = module.get<ConfigService>(ConfigService);

    // Suppress log output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  // =========================================================================
  // Constructor / initialization
  // =========================================================================

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should set enabled = true when WOMPI_PRIVATE_KEY is configured', () => {
      expect(service.enabled).toBe(true);
    });

    it('should set enabled = false when WOMPI_PRIVATE_KEY is empty', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WompiService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(''),
            },
          },
        ],
      }).compile();

      const disabledService = module.get<WompiService>(WompiService);
      expect(disabledService.enabled).toBe(false);
    });

    it('should use sandbox base URL for test keys', () => {
      // The service is initialised with pub_test_ keys - verify a request
      // goes to the sandbox URL.
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockMerchantInfo }),
      );

      service.getMerchantInfo();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(SANDBOX_BASE_URL),
        expect.anything(),
      );
    });

    it('should use production base URL for production keys', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WompiService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                const map: Record<string, string> = {
                  WOMPI_PUBLIC_KEY: 'pub_prod_livekey',
                  WOMPI_PRIVATE_KEY: 'prv_prod_livekey',
                  WOMPI_EVENT_SECRET: TEST_EVENT_SECRET,
                  WOMPI_INTEGRITY_SECRET: TEST_INTEGRITY_SECRET,
                };
                return map[key];
              }),
            },
          },
        ],
      }).compile();

      const prodService = module.get<WompiService>(WompiService);

      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockMerchantInfo }),
      );

      prodService.getMerchantInfo();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://production.wompi.co/v1'),
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // getPublicKey
  // =========================================================================

  describe('getPublicKey', () => {
    it('should return the configured public key', () => {
      expect(service.getPublicKey()).toBe(TEST_PUBLIC_KEY);
    });
  });

  // =========================================================================
  // getMerchantInfo
  // =========================================================================

  describe('getMerchantInfo', () => {
    it('should fetch merchant info from the Wompi API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockMerchantInfo }),
      );

      const result = await service.getMerchantInfo();

      expect(result).toEqual(mockMerchantInfo);
      expect(global.fetch).toHaveBeenCalledWith(
        `${SANDBOX_BASE_URL}/merchants/${TEST_PUBLIC_KEY}`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_PUBLIC_KEY}`,
          }),
        }),
      );
    });

    it('should use public key for authentication (not private)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockMerchantInfo }),
      );

      await service.getMerchantInfo();

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchOptions.headers.Authorization).toBe(
        `Bearer ${TEST_PUBLIC_KEY}`,
      );
    });

    it('should cache merchant info for 5 minutes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockMerchantInfo }),
      );

      // First call fetches from API
      const result1 = await service.getMerchantInfo();
      // Second call should return cached
      const result2 = await service.getMerchantInfo();

      expect(result1).toEqual(mockMerchantInfo);
      expect(result2).toEqual(mockMerchantInfo);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should refetch merchant info after cache expires', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockMerchantInfo }),
      );

      // First call
      await service.getMerchantInfo();

      // Advance time past cache TTL (5 minutes)
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 6 * 60 * 1000);

      // Second call should refetch
      await service.getMerchantInfo();

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw on API error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(
          { error: 'Unauthorized' },
          { ok: false, status: 401, statusText: 'Unauthorized' },
        ),
      );

      await expect(service.getMerchantInfo()).rejects.toThrow(
        'Wompi API error: 401 Unauthorized',
      );
    });

    it('should throw on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      await expect(service.getMerchantInfo()).rejects.toThrow('Network error');
    });
  });

  // =========================================================================
  // createPaymentSource
  // =========================================================================

  describe('createPaymentSource', () => {
    const token = 'tok_card_abc123';
    const email = 'user@example.com';
    const acceptanceToken = 'acc_tok_123';
    const personalAuthToken = 'personal_tok_456';

    it('should create a payment source with required fields', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockPaymentSource }),
      );

      const result = await service.createPaymentSource(
        token,
        email,
        acceptanceToken,
      );

      expect(result).toEqual(mockPaymentSource);
      expect(global.fetch).toHaveBeenCalledWith(
        `${SANDBOX_BASE_URL}/payment_sources`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_PRIVATE_KEY}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            type: 'CARD',
            token,
            customer_email: email,
            acceptance_token: acceptanceToken,
          }),
        }),
      );
    });

    it('should include personal auth token when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockPaymentSource }),
      );

      await service.createPaymentSource(
        token,
        email,
        acceptanceToken,
        personalAuthToken,
      );

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchOptions.body);
      expect(body.accept_personal_auth).toBe(personalAuthToken);
    });

    it('should NOT include personal auth token when not provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockPaymentSource }),
      );

      await service.createPaymentSource(token, email, acceptanceToken);

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchOptions.body);
      expect(body.accept_personal_auth).toBeUndefined();
    });

    it('should use private key for authentication', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockPaymentSource }),
      );

      await service.createPaymentSource(token, email, acceptanceToken);

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchOptions.headers.Authorization).toBe(
        `Bearer ${TEST_PRIVATE_KEY}`,
      );
    });

    it('should throw on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(
          { error: 'Invalid token' },
          { ok: false, status: 422, statusText: 'Unprocessable Entity' },
        ),
      );

      await expect(
        service.createPaymentSource(token, email, acceptanceToken),
      ).rejects.toThrow('Wompi API error: 422 Unprocessable Entity');
    });
  });

  // =========================================================================
  // createTransaction
  // =========================================================================

  describe('createTransaction', () => {
    const baseParams = {
      amountInCents: 5000000,
      currency: 'COP',
      customerEmail: 'user@example.com',
      reference: 'ref-abc',
      acceptanceToken: 'acc_tok_123',
    };

    it('should create a transaction with required fields', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockTransaction }),
      );

      const result = await service.createTransaction(baseParams);

      expect(result).toEqual(mockTransaction);
      expect(global.fetch).toHaveBeenCalledWith(
        `${SANDBOX_BASE_URL}/transactions`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            amount_in_cents: baseParams.amountInCents,
            currency: baseParams.currency,
            customer_email: baseParams.customerEmail,
            reference: baseParams.reference,
            acceptance_token: baseParams.acceptanceToken,
          }),
        }),
      );
    });

    it('should include paymentSourceId when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockTransaction }),
      );

      await service.createTransaction({
        ...baseParams,
        paymentSourceId: 9999,
      });

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchOptions.body);
      expect(body.payment_source_id).toBe(9999);
    });

    it('should include recurrent flag when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockTransaction }),
      );

      await service.createTransaction({
        ...baseParams,
        recurrent: true,
      });

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchOptions.body);
      expect(body.recurrent).toBe(true);
    });

    it('should include redirectUrl when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockTransaction }),
      );

      const redirectUrl = 'https://stockflow.com.co/billing/callback';
      await service.createTransaction({
        ...baseParams,
        redirectUrl,
      });

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchOptions.body);
      expect(body.redirect_url).toBe(redirectUrl);
    });

    it('should include personalAuthToken when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockTransaction }),
      );

      await service.createTransaction({
        ...baseParams,
        personalAuthToken: 'personal_tok_456',
      });

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchOptions.body);
      expect(body.accept_personal_auth).toBe('personal_tok_456');
    });

    it('should NOT include optional fields when not provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockTransaction }),
      );

      await service.createTransaction(baseParams);

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchOptions.body);
      expect(body.payment_source_id).toBeUndefined();
      expect(body.recurrent).toBeUndefined();
      expect(body.redirect_url).toBeUndefined();
      expect(body.accept_personal_auth).toBeUndefined();
    });

    it('should include all optional fields when all provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockTransaction }),
      );

      await service.createTransaction({
        ...baseParams,
        paymentSourceId: 9999,
        recurrent: true,
        redirectUrl: 'https://stockflow.com.co/callback',
        personalAuthToken: 'personal_tok_456',
      });

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchOptions.body);
      expect(body.payment_source_id).toBe(9999);
      expect(body.recurrent).toBe(true);
      expect(body.redirect_url).toBe('https://stockflow.com.co/callback');
      expect(body.accept_personal_auth).toBe('personal_tok_456');
    });

    it('should use private key for authentication', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockTransaction }),
      );

      await service.createTransaction(baseParams);

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchOptions.headers.Authorization).toBe(
        `Bearer ${TEST_PRIVATE_KEY}`,
      );
    });

    it('should throw on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(
          { error: 'Bad Request' },
          { ok: false, status: 400, statusText: 'Bad Request' },
        ),
      );

      await expect(service.createTransaction(baseParams)).rejects.toThrow(
        'Wompi API error: 400 Bad Request',
      );
    });
  });

  // =========================================================================
  // getTransaction
  // =========================================================================

  describe('getTransaction', () => {
    it('should fetch a transaction by ID', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockTransaction }),
      );

      const result = await service.getTransaction('txn-001');

      expect(result).toEqual(mockTransaction);
      expect(global.fetch).toHaveBeenCalledWith(
        `${SANDBOX_BASE_URL}/transactions/txn-001`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_PRIVATE_KEY}`,
          }),
        }),
      );
    });

    it('should not send a body for GET requests', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockTransaction }),
      );

      await service.getTransaction('txn-001');

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchOptions.body).toBeUndefined();
    });

    it('should throw on 404 not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(
          { error: 'Not found' },
          { ok: false, status: 404, statusText: 'Not Found' },
        ),
      );

      await expect(service.getTransaction('nonexistent')).rejects.toThrow(
        'Wompi API error: 404 Not Found',
      );
    });

    it('should throw on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('fetch failed'),
      );

      await expect(service.getTransaction('txn-001')).rejects.toThrow(
        'fetch failed',
      );
    });
  });

  // =========================================================================
  // voidPaymentSource
  // =========================================================================

  describe('voidPaymentSource', () => {
    it('should send a PUT request to void the payment source', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: { id: 9999, status: 'VOIDED' } }),
      );

      await service.voidPaymentSource(9999);

      expect(global.fetch).toHaveBeenCalledWith(
        `${SANDBOX_BASE_URL}/payment_sources/9999/void`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_PRIVATE_KEY}`,
          }),
        }),
      );
    });

    it('should return void (no return value)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: { id: 9999, status: 'VOIDED' } }),
      );

      const result = await service.voidPaymentSource(9999);

      expect(result).toBeUndefined();
    });

    it('should throw on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(
          { error: 'Not found' },
          { ok: false, status: 404, statusText: 'Not Found' },
        ),
      );

      await expect(service.voidPaymentSource(9999)).rejects.toThrow(
        'Wompi API error: 404 Not Found',
      );
    });
  });

  // =========================================================================
  // generateIntegrityHash
  // =========================================================================

  describe('generateIntegrityHash', () => {
    it('should generate a correct SHA256 hash without expiration time', () => {
      const reference = 'ref-abc';
      const amountInCents = 5000000;
      const currency = 'COP';

      const expectedPayload = `${reference}${amountInCents}${currency}${TEST_INTEGRITY_SECRET}`;
      const expectedHash = createHash('sha256')
        .update(expectedPayload)
        .digest('hex');

      const result = service.generateIntegrityHash(
        reference,
        amountInCents,
        currency,
      );

      expect(result).toBe(expectedHash);
    });

    it('should include expiration time in hash when provided', () => {
      const reference = 'ref-abc';
      const amountInCents = 5000000;
      const currency = 'COP';
      const expirationTime = '2026-02-15T23:59:59.000Z';

      const expectedPayload = `${reference}${amountInCents}${currency}${expirationTime}${TEST_INTEGRITY_SECRET}`;
      const expectedHash = createHash('sha256')
        .update(expectedPayload)
        .digest('hex');

      const result = service.generateIntegrityHash(
        reference,
        amountInCents,
        currency,
        expirationTime,
      );

      expect(result).toBe(expectedHash);
    });

    it('should return a 64-character hex string (SHA256)', () => {
      const result = service.generateIntegrityHash('ref', 100, 'COP');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different references', () => {
      const hash1 = service.generateIntegrityHash('ref-1', 5000000, 'COP');
      const hash2 = service.generateIntegrityHash('ref-2', 5000000, 'COP');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different amounts', () => {
      const hash1 = service.generateIntegrityHash('ref-abc', 5000000, 'COP');
      const hash2 = service.generateIntegrityHash('ref-abc', 10000000, 'COP');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different currencies', () => {
      const hash1 = service.generateIntegrityHash('ref-abc', 5000000, 'COP');
      const hash2 = service.generateIntegrityHash('ref-abc', 5000000, 'USD');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce deterministic output for the same input', () => {
      const args: [string, number, string] = ['ref-abc', 5000000, 'COP'];
      const hash1 = service.generateIntegrityHash(...args);
      const hash2 = service.generateIntegrityHash(...args);

      expect(hash1).toBe(hash2);
    });
  });

  // =========================================================================
  // verifyWebhookSignature
  // =========================================================================

  describe('verifyWebhookSignature', () => {
    /**
     * Build a valid webhook body that will pass signature verification.
     * Mirrors the Wompi signing algorithm exactly.
     */
    function buildSignedWebhookBody(
      data: Record<string, unknown>,
      properties: string[],
      timestamp: number,
    ) {
      // Resolve property values in order, concatenate, add timestamp + secret
      const values = properties.map((prop) => {
        const parts = prop.split('.');
        let current: unknown = data;
        for (const part of parts) {
          if (current === null || current === undefined) return '';
          current = (current as Record<string, unknown>)[part];
        }
        return String(current ?? '');
      });

      const concatenated =
        values.join('') + String(timestamp) + TEST_EVENT_SECRET;
      const checksum = createHash('sha256')
        .update(concatenated)
        .digest('hex');

      return {
        event: 'transaction.updated',
        data,
        timestamp,
        signature: {
          properties,
          checksum,
        },
      };
    }

    it('should return true for a valid webhook signature', () => {
      const data = {
        transaction: {
          id: 'txn-001',
          status: 'APPROVED',
          amount_in_cents: 5000000,
        },
      };

      const body = buildSignedWebhookBody(
        data,
        [
          'transaction.id',
          'transaction.status',
          'transaction.amount_in_cents',
        ],
        1700000000,
      );

      expect(service.verifyWebhookSignature(body)).toBe(true);
    });

    it('should return false for an invalid checksum', () => {
      const body = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'txn-001',
            status: 'APPROVED',
          },
        },
        timestamp: 1700000000,
        signature: {
          properties: ['transaction.id', 'transaction.status'],
          checksum: 'invalid_checksum_that_does_not_match_anything_at_all_64ch',
        },
      };

      expect(service.verifyWebhookSignature(body)).toBe(false);
    });

    it('should return false when signature field is missing', () => {
      const body = {
        event: 'transaction.updated',
        data: { transaction: { id: 'txn-001' } },
        timestamp: 1700000000,
        signature: undefined as unknown,
      };

      expect(
        service.verifyWebhookSignature(
          body as unknown as Parameters<
            typeof service.verifyWebhookSignature
          >[0],
        ),
      ).toBe(false);
    });

    it('should return false when signature.properties is missing', () => {
      const body = {
        event: 'transaction.updated',
        data: { transaction: { id: 'txn-001' } },
        timestamp: 1700000000,
        signature: {
          checksum: 'abc123',
        },
      };

      expect(
        service.verifyWebhookSignature(
          body as unknown as Parameters<
            typeof service.verifyWebhookSignature
          >[0],
        ),
      ).toBe(false);
    });

    it('should return false when signature.checksum is missing', () => {
      const body = {
        event: 'transaction.updated',
        data: { transaction: { id: 'txn-001' } },
        timestamp: 1700000000,
        signature: {
          properties: ['transaction.id'],
        },
      };

      expect(
        service.verifyWebhookSignature(
          body as unknown as Parameters<
            typeof service.verifyWebhookSignature
          >[0],
        ),
      ).toBe(false);
    });

    it('should return false when data field is missing', () => {
      const body = {
        event: 'transaction.updated',
        data: undefined as unknown,
        timestamp: 1700000000,
        signature: {
          properties: ['transaction.id'],
          checksum: 'abc',
        },
      };

      expect(
        service.verifyWebhookSignature(
          body as unknown as Parameters<
            typeof service.verifyWebhookSignature
          >[0],
        ),
      ).toBe(false);
    });

    it('should handle nested property paths correctly', () => {
      const data = {
        transaction: {
          id: 'txn-deep',
          payment_method: {
            type: 'CARD',
            extra: {
              brand: 'VISA',
            },
          },
        },
      };

      const body = buildSignedWebhookBody(
        data,
        [
          'transaction.id',
          'transaction.payment_method.type',
          'transaction.payment_method.extra.brand',
        ],
        1700000001,
      );

      expect(service.verifyWebhookSignature(body)).toBe(true);
    });

    it('should handle missing nested properties gracefully (empty string)', () => {
      // A property that does not exist should resolve to ''
      const data = {
        transaction: {
          id: 'txn-001',
        },
      };

      const body = buildSignedWebhookBody(
        data,
        ['transaction.id', 'transaction.nonexistent'],
        1700000002,
      );

      expect(service.verifyWebhookSignature(body)).toBe(true);
    });

    it('should use timing-safe comparison to prevent timing attacks', () => {
      // Verify that an incorrect checksum of the correct length is still rejected.
      // This tests that the comparison is working (not that it is specifically
      // timing-safe, which is an implementation detail of timingSafeEqual).
      const data = {
        transaction: { id: 'txn-001', status: 'APPROVED' },
      };

      const validBody = buildSignedWebhookBody(
        data,
        ['transaction.id', 'transaction.status'],
        1700000000,
      );

      // Flip a single character in the checksum
      const tamperedChecksum =
        validBody.signature.checksum.slice(0, -1) +
        (validBody.signature.checksum.slice(-1) === 'a' ? 'b' : 'a');

      const tamperedBody = {
        ...validBody,
        signature: {
          ...validBody.signature,
          checksum: tamperedChecksum,
        },
      };

      expect(service.verifyWebhookSignature(tamperedBody)).toBe(false);
    });

    it('should return false and not throw on mismatched checksum lengths', () => {
      // timingSafeEqual throws if buffers differ in length. The service
      // guards against this with a length check before calling timingSafeEqual.
      const data = {
        transaction: { id: 'txn-001' },
      };

      const body = {
        event: 'transaction.updated',
        data,
        timestamp: 1700000000,
        signature: {
          properties: ['transaction.id'],
          checksum: 'short',
        },
      };

      expect(service.verifyWebhookSignature(body)).toBe(false);
    });

    it('should return false on unexpected errors (catch block)', () => {
      // Force an error by passing properties as a non-iterable.
      const body = {
        event: 'transaction.updated',
        data: { transaction: { id: 'txn-001' } },
        timestamp: 1700000000,
        signature: {
          properties: null as unknown as string[],
          checksum: 'abc123',
        },
      };

      expect(
        service.verifyWebhookSignature(
          body as unknown as Parameters<
            typeof service.verifyWebhookSignature
          >[0],
        ),
      ).toBe(false);
    });

    it('should return false and log error when an unexpected exception is thrown inside try block', () => {
      // Force the catch block (lines 388-391) by providing properties as a
      // truthy non-array value so the initial validation passes but .map() throws.
      const body = {
        event: 'transaction.updated',
        data: { transaction: { id: 'txn-001' } },
        timestamp: 1700000000,
        signature: {
          properties: 42 as unknown as string[],
          checksum: 'a'.repeat(64),
        },
      };

      const result = service.verifyWebhookSignature(
        body as unknown as Parameters<
          typeof service.verifyWebhookSignature
        >[0],
      );

      expect(result).toBe(false);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error verifying webhook signature'),
      );
    });

    it('should handle null values in nested property paths (resolvePropertyPath null branch)', () => {
      // When a property path traverses through a null value, resolvePropertyPath
      // should return '' (line 476). Build a signed body where one of the
      // property paths goes through an explicitly null intermediate value.
      const data = {
        transaction: {
          id: 'txn-null',
          payment_method: null as unknown as Record<string, unknown>,
        },
      };

      // The property 'transaction.payment_method.type' will resolve '' because
      // payment_method is null and the loop hits the null guard.
      const body = buildSignedWebhookBody(
        data,
        ['transaction.id', 'transaction.payment_method.type'],
        1700000003,
      );

      expect(service.verifyWebhookSignature(body)).toBe(true);
    });
  });

  // =========================================================================
  // Private request method (tested indirectly)
  // =========================================================================

  describe('request (private method - tested via public API)', () => {
    it('should include Content-Type application/json header', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockTransaction }),
      );

      await service.getTransaction('txn-001');

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchOptions.headers['Content-Type']).toBe('application/json');
    });

    it('should include an AbortController signal for timeouts', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ data: mockTransaction }),
      );

      await service.getTransaction('txn-001');

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchOptions.signal).toBeDefined();
      expect(fetchOptions.signal).toBeInstanceOf(AbortSignal);
    });

    it('should throw a timeout error when fetch is aborted', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      (global.fetch as jest.Mock).mockRejectedValue(abortError);

      await expect(service.getTransaction('txn-001')).rejects.toThrow(
        'Wompi request timeout: GET /transactions/txn-001',
      );
    });

    it('should log and rethrow non-abort errors', async () => {
      const genericError = new Error('Connection refused');

      (global.fetch as jest.Mock).mockRejectedValue(genericError);

      await expect(service.getTransaction('txn-001')).rejects.toThrow(
        'Connection refused',
      );
    });

    it('should parse error response body on non-ok status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(
          { message: 'Rate limit exceeded' },
          { ok: false, status: 429, statusText: 'Too Many Requests' },
        ),
      );

      await expect(service.getTransaction('txn-001')).rejects.toThrow(
        'Wompi API error: 429 Too Many Requests',
      );
    });
  });
});

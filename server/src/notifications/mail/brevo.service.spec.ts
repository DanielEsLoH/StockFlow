import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BrevoService,
  SendEmailOptions,
  LowStockProductEmail,
} from './brevo.service';
import * as Brevo from '@getbrevo/brevo';

// Mock the Brevo module
jest.mock('@getbrevo/brevo', () => {
  const mockSendTransacEmail = jest.fn();
  const mockSetApiKey = jest.fn();

  return {
    TransactionalEmailsApi: jest.fn().mockImplementation(() => ({
      sendTransacEmail: mockSendTransacEmail,
      setApiKey: mockSetApiKey,
    })),
    TransactionalEmailsApiApiKeys: {
      apiKey: 0,
    },
    SendSmtpEmail: jest.fn().mockImplementation(() => ({})),
  };
});

describe('BrevoService', () => {
  let service: BrevoService;
  let mockApiInstance: {
    sendTransacEmail: jest.Mock;
    setApiKey: jest.Mock;
  };

  const mockSendResult = {
    body: {
      messageId: '<msg-123@brevo.com>',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Get the mock instance
    const MockTransactionalEmailsApi =
      Brevo.TransactionalEmailsApi as jest.Mock;
    mockApiInstance = {
      sendTransacEmail: jest.fn().mockResolvedValue(mockSendResult),
      setApiKey: jest.fn(),
    };
    MockTransactionalEmailsApi.mockImplementation(() => mockApiInstance);

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrevoService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BrevoService>(BrevoService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should log warning when API key is not configured', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      const mockConfigServiceNotConfigured = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'BREVO_API_KEY') return undefined;
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BrevoService,
          { provide: ConfigService, useValue: mockConfigServiceNotConfigured },
        ],
      }).compile();

      module.get<BrevoService>(BrevoService);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Brevo API key not configured'),
      );
    });

    it('should log success when API key is configured', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      const mockConfigServiceConfigured = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'BREVO_API_KEY') return 'test-api-key';
          if (key === 'BREVO_SENDER_EMAIL') return 'test@example.com';
          if (key === 'BREVO_SENDER_NAME') return 'Test Sender';
          if (key === 'app.frontendUrl') return 'https://app.stockflow.com';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BrevoService,
          { provide: ConfigService, useValue: mockConfigServiceConfigured },
        ],
      }).compile();

      module.get<BrevoService>(BrevoService);

      expect(logSpy).toHaveBeenCalledWith(
        'Brevo email service configured successfully',
      );
    });

    it('should use default sender values when not configured', async () => {
      const mockConfigServicePartial = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'BREVO_API_KEY') return 'test-api-key';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BrevoService,
          { provide: ConfigService, useValue: mockConfigServicePartial },
        ],
      }).compile();

      const brevoService = module.get<BrevoService>(BrevoService);

      expect(brevoService).toBeDefined();
      expect(brevoService.isConfigured()).toBe(true);
    });
  });

  describe('isConfigured', () => {
    it('should return false when API key is not set', async () => {
      const mockConfigServiceNotConfigured = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BrevoService,
          { provide: ConfigService, useValue: mockConfigServiceNotConfigured },
        ],
      }).compile();

      const brevoService = module.get<BrevoService>(BrevoService);

      expect(brevoService.isConfigured()).toBe(false);
    });

    it('should return true when API key is set', async () => {
      const mockConfigServiceConfigured = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'BREVO_API_KEY') return 'test-api-key';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BrevoService,
          { provide: ConfigService, useValue: mockConfigServiceConfigured },
        ],
      }).compile();

      const brevoService = module.get<BrevoService>(BrevoService);

      expect(brevoService.isConfigured()).toBe(true);
    });
  });

  describe('sendEmail', () => {
    const mockEmailOptions: SendEmailOptions = {
      to: 'test@example.com',
      subject: 'Test Subject',
      htmlContent: '<p>Test content</p>',
    };

    describe('when not configured', () => {
      let brevoServiceNotConfigured: BrevoService;

      beforeEach(async () => {
        const mockConfigServiceNotConfigured = {
          get: jest.fn().mockReturnValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            BrevoService,
            {
              provide: ConfigService,
              useValue: mockConfigServiceNotConfigured,
            },
          ],
        }).compile();

        brevoServiceNotConfigured = module.get<BrevoService>(BrevoService);
      });

      it('should return success with special messageId when not configured', async () => {
        const result =
          await brevoServiceNotConfigured.sendEmail(mockEmailOptions);

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('brevo-not-configured');
      });

      it('should log debug message when not configured', async () => {
        const debugSpy = jest.spyOn(Logger.prototype, 'debug');

        await brevoServiceNotConfigured.sendEmail(mockEmailOptions);

        expect(debugSpy).toHaveBeenCalledWith(
          expect.stringContaining('Brevo not configured'),
        );
      });

      it('should handle array of recipients in not configured log', async () => {
        const debugSpy = jest.spyOn(Logger.prototype, 'debug');

        await brevoServiceNotConfigured.sendEmail({
          ...mockEmailOptions,
          to: ['user1@example.com', 'user2@example.com'],
        });

        expect(debugSpy).toHaveBeenCalledWith(
          expect.stringContaining('user1@example.com, user2@example.com'),
        );
      });
    });

    describe('email validation', () => {
      let brevoServiceConfigured: BrevoService;

      beforeEach(async () => {
        const mockConfigServiceConfigured = {
          get: jest.fn().mockImplementation((key: string) => {
            if (key === 'BREVO_API_KEY') return 'test-api-key';
            if (key === 'BREVO_SENDER_EMAIL') return 'noreply@stockflow.com';
            if (key === 'BREVO_SENDER_NAME') return 'StockFlow';
            if (key === 'app.frontendUrl') return 'https://app.stockflow.com';
            return undefined;
          }),
        };

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            BrevoService,
            { provide: ConfigService, useValue: mockConfigServiceConfigured },
          ],
        }).compile();

        brevoServiceConfigured = module.get<BrevoService>(BrevoService);
      });

      it('should reject invalid email addresses', async () => {
        const result = await brevoServiceConfigured.sendEmail({
          ...mockEmailOptions,
          to: 'invalid-email',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid email addresses');
      });

      it('should reject multiple invalid email addresses', async () => {
        const result = await brevoServiceConfigured.sendEmail({
          ...mockEmailOptions,
          to: ['valid@example.com', 'invalid', 'also-invalid'],
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('invalid');
        expect(result.error).toContain('also-invalid');
      });

      it('should accept valid email addresses', async () => {
        const result = await brevoServiceConfigured.sendEmail(mockEmailOptions);

        expect(result.success).toBe(true);
      });

      it('should accept array of valid emails', async () => {
        const result = await brevoServiceConfigured.sendEmail({
          ...mockEmailOptions,
          to: ['user1@example.com', 'user2@example.com'],
        });

        expect(result.success).toBe(true);
      });
    });

    describe('when configured', () => {
      let brevoServiceConfigured: BrevoService;

      beforeEach(async () => {
        const mockConfigServiceConfigured = {
          get: jest.fn().mockImplementation((key: string) => {
            if (key === 'BREVO_API_KEY') return 'test-api-key';
            if (key === 'BREVO_SENDER_EMAIL') return 'noreply@stockflow.com';
            if (key === 'BREVO_SENDER_NAME') return 'StockFlow';
            if (key === 'app.frontendUrl') return 'https://app.stockflow.com';
            return undefined;
          }),
        };

        // Reset mock
        const MockTransactionalEmailsApi =
          Brevo.TransactionalEmailsApi as jest.Mock;
        mockApiInstance = {
          sendTransacEmail: jest.fn().mockResolvedValue(mockSendResult),
          setApiKey: jest.fn(),
        };
        MockTransactionalEmailsApi.mockImplementation(() => mockApiInstance);

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            BrevoService,
            { provide: ConfigService, useValue: mockConfigServiceConfigured },
          ],
        }).compile();

        brevoServiceConfigured = module.get<BrevoService>(BrevoService);
      });

      it('should send email successfully', async () => {
        const result = await brevoServiceConfigured.sendEmail(mockEmailOptions);

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('<msg-123@brevo.com>');
      });

      it('should log success message with messageId', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');

        await brevoServiceConfigured.sendEmail(mockEmailOptions);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Email sent successfully'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('<msg-123@brevo.com>'),
        );
      });

      it('should handle missing messageId in result', async () => {
        mockApiInstance.sendTransacEmail.mockResolvedValue({ body: {} });
        const logSpy = jest.spyOn(Logger.prototype, 'log');

        await brevoServiceConfigured.sendEmail(mockEmailOptions);

        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('unknown'));
      });

      it('should include text content when provided', async () => {
        await brevoServiceConfigured.sendEmail({
          ...mockEmailOptions,
          textContent: 'Plain text content',
        });

        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalled();
      });

      it('should include attachments when provided', async () => {
        const attachments = [{ name: 'test.pdf', content: 'base64content' }];

        await brevoServiceConfigured.sendEmail({
          ...mockEmailOptions,
          attachments,
        });

        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalled();
      });
    });

    describe('retry logic on transient failures', () => {
      let brevoServiceConfigured: BrevoService;

      beforeEach(async () => {
        const mockConfigServiceConfigured = {
          get: jest.fn().mockImplementation((key: string) => {
            if (key === 'BREVO_API_KEY') return 'test-api-key';
            if (key === 'BREVO_SENDER_EMAIL') return 'noreply@stockflow.com';
            if (key === 'BREVO_SENDER_NAME') return 'StockFlow';
            if (key === 'app.frontendUrl') return 'https://app.stockflow.com';
            return undefined;
          }),
        };

        const MockTransactionalEmailsApi =
          Brevo.TransactionalEmailsApi as jest.Mock;
        mockApiInstance = {
          sendTransacEmail: jest.fn(),
          setApiKey: jest.fn(),
        };
        MockTransactionalEmailsApi.mockImplementation(() => mockApiInstance);

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            BrevoService,
            { provide: ConfigService, useValue: mockConfigServiceConfigured },
          ],
        }).compile();

        brevoServiceConfigured = module.get<BrevoService>(BrevoService);
      });

      it('should retry on ECONNRESET error', async () => {
        const retryableError = new Error('ECONNRESET');
        mockApiInstance.sendTransacEmail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendResult);

        const resultPromise =
          brevoServiceConfigured.sendEmail(mockEmailOptions);

        await jest.advanceTimersByTimeAsync(1000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalledTimes(2);
      });

      it('should retry on ETIMEDOUT error', async () => {
        const retryableError = new Error('ETIMEDOUT');
        mockApiInstance.sendTransacEmail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendResult);

        const resultPromise =
          brevoServiceConfigured.sendEmail(mockEmailOptions);

        await jest.advanceTimersByTimeAsync(1000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
      });

      it('should retry on rate limit (429) error', async () => {
        const retryableError = new Error('429 Too Many Requests');
        mockApiInstance.sendTransacEmail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendResult);

        const resultPromise =
          brevoServiceConfigured.sendEmail(mockEmailOptions);

        await jest.advanceTimersByTimeAsync(1000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
      });

      it('should retry on server error (500)', async () => {
        const retryableError = new Error('500 Internal Server Error');
        mockApiInstance.sendTransacEmail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendResult);

        const resultPromise =
          brevoServiceConfigured.sendEmail(mockEmailOptions);

        await jest.advanceTimersByTimeAsync(1000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
      });

      it('should retry on service unavailable (503)', async () => {
        const retryableError = new Error('503 Service Unavailable');
        mockApiInstance.sendTransacEmail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendResult);

        const resultPromise =
          brevoServiceConfigured.sendEmail(mockEmailOptions);

        await jest.advanceTimersByTimeAsync(1000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
      });

      it('should retry on error with ECONNRESET code', async () => {
        const retryableError = new Error(
          'Connection error',
        ) as NodeJS.ErrnoException;
        retryableError.code = 'ECONNRESET';
        mockApiInstance.sendTransacEmail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendResult);

        const resultPromise =
          brevoServiceConfigured.sendEmail(mockEmailOptions);

        await jest.advanceTimersByTimeAsync(1000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
      });

      it('should use exponential backoff for delays', async () => {
        const retryableError = new Error('ECONNRESET');
        mockApiInstance.sendTransacEmail
          .mockRejectedValueOnce(retryableError)
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendResult);

        const resultPromise =
          brevoServiceConfigured.sendEmail(mockEmailOptions);

        // First retry after 1000ms
        await jest.advanceTimersByTimeAsync(1000);
        // Second retry after 2000ms (exponential backoff)
        await jest.advanceTimersByTimeAsync(2000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalledTimes(3);
      });

      it('should log warning on retry attempts', async () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        const retryableError = new Error('ECONNRESET');
        mockApiInstance.sendTransacEmail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendResult);

        const resultPromise =
          brevoServiceConfigured.sendEmail(mockEmailOptions);

        await jest.advanceTimersByTimeAsync(1000);
        await resultPromise;

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('attempt 1/3'),
        );
      });
    });

    describe('failure after max retries', () => {
      let brevoServiceConfigured: BrevoService;

      beforeEach(async () => {
        const mockConfigServiceConfigured = {
          get: jest.fn().mockImplementation((key: string) => {
            if (key === 'BREVO_API_KEY') return 'test-api-key';
            if (key === 'BREVO_SENDER_EMAIL') return 'noreply@stockflow.com';
            if (key === 'BREVO_SENDER_NAME') return 'StockFlow';
            if (key === 'app.frontendUrl') return 'https://app.stockflow.com';
            return undefined;
          }),
        };

        const MockTransactionalEmailsApi =
          Brevo.TransactionalEmailsApi as jest.Mock;
        mockApiInstance = {
          sendTransacEmail: jest.fn(),
          setApiKey: jest.fn(),
        };
        MockTransactionalEmailsApi.mockImplementation(() => mockApiInstance);

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            BrevoService,
            { provide: ConfigService, useValue: mockConfigServiceConfigured },
          ],
        }).compile();

        brevoServiceConfigured = module.get<BrevoService>(BrevoService);
      });

      it('should fail after max retries exceeded', async () => {
        const retryableError = new Error('ECONNRESET');
        mockApiInstance.sendTransacEmail.mockRejectedValue(retryableError);

        const resultPromise =
          brevoServiceConfigured.sendEmail(mockEmailOptions);

        // Advance through all retry delays
        await jest.advanceTimersByTimeAsync(1000);
        await jest.advanceTimersByTimeAsync(2000);

        const result = await resultPromise;

        expect(result.success).toBe(false);
        expect(result.error).toBe('ECONNRESET');
        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalledTimes(3);
      });

      it('should log error after final failure', async () => {
        const errorSpy = jest.spyOn(Logger.prototype, 'error');
        const retryableError = new Error('ECONNRESET');
        mockApiInstance.sendTransacEmail.mockRejectedValue(retryableError);

        const resultPromise =
          brevoServiceConfigured.sendEmail(mockEmailOptions);

        await jest.advanceTimersByTimeAsync(1000);
        await jest.advanceTimersByTimeAsync(2000);
        await resultPromise;

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to send email'),
          expect.any(String),
        );
      });

      it('should not retry on non-retryable errors', async () => {
        const nonRetryableError = new Error('Invalid API key');
        mockApiInstance.sendTransacEmail.mockRejectedValue(nonRetryableError);

        const result = await brevoServiceConfigured.sendEmail(mockEmailOptions);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid API key');
        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalledTimes(1);
      });

      it('should handle non-Error objects in catch', async () => {
        mockApiInstance.sendTransacEmail.mockRejectedValue('string error');

        const result = await brevoServiceConfigured.sendEmail(mockEmailOptions);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown error');
      });

      it('should not retry non-Error thrown values', async () => {
        mockApiInstance.sendTransacEmail.mockRejectedValue({ code: 'CUSTOM' });

        const result = await brevoServiceConfigured.sendEmail(mockEmailOptions);

        expect(result.success).toBe(false);
        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalledTimes(1);
      });

      it('should handle error without stack trace in log', async () => {
        const errorSpy = jest.spyOn(Logger.prototype, 'error');
        mockApiInstance.sendTransacEmail.mockRejectedValue('non-error value');

        await brevoServiceConfigured.sendEmail(mockEmailOptions);

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to send email'),
          undefined,
        );
      });
    });
  });

  describe('convenience methods', () => {
    let brevoServiceConfigured: BrevoService;

    beforeEach(async () => {
      const mockConfigServiceConfigured = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'BREVO_API_KEY') return 'test-api-key';
          if (key === 'BREVO_SENDER_EMAIL') return 'noreply@stockflow.com';
          if (key === 'BREVO_SENDER_NAME') return 'StockFlow';
          if (key === 'app.frontendUrl') return 'https://app.stockflow.com';
          return undefined;
        }),
      };

      const MockTransactionalEmailsApi =
        Brevo.TransactionalEmailsApi as jest.Mock;
      mockApiInstance = {
        sendTransacEmail: jest.fn().mockResolvedValue(mockSendResult),
        setApiKey: jest.fn(),
      };
      MockTransactionalEmailsApi.mockImplementation(() => mockApiInstance);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BrevoService,
          { provide: ConfigService, useValue: mockConfigServiceConfigured },
        ],
      }).compile();

      brevoServiceConfigured = module.get<BrevoService>(BrevoService);
    });

    describe('sendWelcomeEmail', () => {
      it('should send welcome email successfully', async () => {
        const result = await brevoServiceConfigured.sendWelcomeEmail(
          'user@example.com',
          'John Doe',
          'Acme Corp',
        );

        expect(result.success).toBe(true);
        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalled();
      });

      it('should include user name in subject', async () => {
        await brevoServiceConfigured.sendWelcomeEmail(
          'user@example.com',
          'John Doe',
          'Acme Corp',
        );

        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalled();
      });

      it('should include tenant name in content', async () => {
        await brevoServiceConfigured.sendWelcomeEmail(
          'user@example.com',
          'John Doe',
          'Acme Corp',
        );

        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalled();
      });
    });

    describe('sendInvoiceEmail', () => {
      it('should send invoice email successfully', async () => {
        const result = await brevoServiceConfigured.sendInvoiceEmail(
          'customer@example.com',
          'Jane Customer',
          'INV-001',
          1500.5,
          new Date('2024-02-15'),
          'Acme Corp',
        );

        expect(result.success).toBe(true);
      });

      it('should handle null due date', async () => {
        const result = await brevoServiceConfigured.sendInvoiceEmail(
          'customer@example.com',
          'Jane Customer',
          'INV-001',
          1500.5,
          null,
          'Acme Corp',
        );

        expect(result.success).toBe(true);
      });

      it('should include PDF attachment when provided', async () => {
        const pdfBuffer = Buffer.from('test pdf content');

        const result = await brevoServiceConfigured.sendInvoiceEmail(
          'customer@example.com',
          'Jane Customer',
          'INV-001',
          1500.5,
          new Date('2024-02-15'),
          'Acme Corp',
          pdfBuffer,
        );

        expect(result.success).toBe(true);
      });

      it('should encode PDF attachment as base64', async () => {
        const pdfBuffer = Buffer.from('test pdf content');

        await brevoServiceConfigured.sendInvoiceEmail(
          'customer@example.com',
          'Jane Customer',
          'INV-001',
          1500.5,
          new Date('2024-02-15'),
          'Acme Corp',
          pdfBuffer,
        );

        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalled();
      });
    });

    describe('sendPasswordResetEmail', () => {
      it('should send password reset email successfully', async () => {
        const result = await brevoServiceConfigured.sendPasswordResetEmail(
          'user@example.com',
          'reset-token-123',
          'John Doe',
        );

        expect(result.success).toBe(true);
      });

      it('should include reset link in email', async () => {
        await brevoServiceConfigured.sendPasswordResetEmail(
          'user@example.com',
          'reset-token-123',
          'John Doe',
        );

        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalled();
      });
    });

    describe('sendLowStockAlertEmail', () => {
      const mockProducts: LowStockProductEmail[] = [
        { sku: 'SKU-001', name: 'Product 1', currentStock: 5, minStock: 10 },
        { sku: 'SKU-002', name: 'Product 2', currentStock: 2, minStock: 5 },
      ];

      it('should send low stock alert successfully', async () => {
        const result = await brevoServiceConfigured.sendLowStockAlertEmail(
          ['admin@example.com'],
          mockProducts,
          'Acme Corp',
        );

        expect(result.success).toBe(true);
      });

      it('should send to multiple admins', async () => {
        const result = await brevoServiceConfigured.sendLowStockAlertEmail(
          ['admin1@example.com', 'admin2@example.com'],
          mockProducts,
          'Acme Corp',
        );

        expect(result.success).toBe(true);
      });

      it('should include product count in subject', async () => {
        await brevoServiceConfigured.sendLowStockAlertEmail(
          ['admin@example.com'],
          mockProducts,
          'Acme Corp',
        );

        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalled();
      });
    });

    describe('sendOverdueInvoiceEmail', () => {
      it('should send overdue invoice email successfully', async () => {
        const result = await brevoServiceConfigured.sendOverdueInvoiceEmail(
          'customer@example.com',
          'Jane Customer',
          'INV-001',
          1500.5,
          new Date('2024-01-01'),
          15,
          'Acme Corp',
        );

        expect(result.success).toBe(true);
      });

      it('should include days overdue in subject', async () => {
        await brevoServiceConfigured.sendOverdueInvoiceEmail(
          'customer@example.com',
          'Jane Customer',
          'INV-001',
          1500.5,
          new Date('2024-01-01'),
          15,
          'Acme Corp',
        );

        expect(mockApiInstance.sendTransacEmail).toHaveBeenCalled();
      });
    });

    describe('sendPaymentReceivedEmail', () => {
      it('should send payment received email successfully', async () => {
        const result = await brevoServiceConfigured.sendPaymentReceivedEmail(
          'customer@example.com',
          'Jane Customer',
          'INV-001',
          500.0,
          'CREDIT_CARD',
          1000.0,
          'Acme Corp',
        );

        expect(result.success).toBe(true);
      });

      it('should handle paid in full (zero balance)', async () => {
        const result = await brevoServiceConfigured.sendPaymentReceivedEmail(
          'customer@example.com',
          'Jane Customer',
          'INV-001',
          1500.0,
          'BANK_TRANSFER',
          0,
          'Acme Corp',
        );

        expect(result.success).toBe(true);
      });

      it('should format payment methods correctly', async () => {
        const paymentMethods = [
          'CASH',
          'CREDIT_CARD',
          'DEBIT_CARD',
          'BANK_TRANSFER',
          'CHECK',
          'OTHER',
        ];

        for (const method of paymentMethods) {
          const result = await brevoServiceConfigured.sendPaymentReceivedEmail(
            'customer@example.com',
            'Jane Customer',
            'INV-001',
            100.0,
            method,
            0,
            'Acme Corp',
          );

          expect(result.success).toBe(true);
        }
      });

      it('should handle unknown payment method', async () => {
        const result = await brevoServiceConfigured.sendPaymentReceivedEmail(
          'customer@example.com',
          'Jane Customer',
          'INV-001',
          100.0,
          'UNKNOWN_METHOD',
          0,
          'Acme Corp',
        );

        expect(result.success).toBe(true);
      });
    });
  });

  describe('HTML template generation', () => {
    let brevoServiceConfigured: BrevoService;

    beforeEach(async () => {
      const mockConfigServiceConfigured = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'BREVO_API_KEY') return 'test-api-key';
          if (key === 'BREVO_SENDER_EMAIL') return 'noreply@stockflow.com';
          if (key === 'BREVO_SENDER_NAME') return 'StockFlow';
          if (key === 'app.frontendUrl') return 'https://app.stockflow.com';
          return undefined;
        }),
      };

      const MockTransactionalEmailsApi =
        Brevo.TransactionalEmailsApi as jest.Mock;
      mockApiInstance = {
        sendTransacEmail: jest.fn().mockResolvedValue(mockSendResult),
        setApiKey: jest.fn(),
      };
      MockTransactionalEmailsApi.mockImplementation(() => mockApiInstance);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BrevoService,
          { provide: ConfigService, useValue: mockConfigServiceConfigured },
        ],
      }).compile();

      brevoServiceConfigured = module.get<BrevoService>(BrevoService);
    });

    it('should include StockFlow branding in emails', async () => {
      await brevoServiceConfigured.sendWelcomeEmail(
        'user@example.com',
        'Test User',
        'Test Org',
      );

      expect(mockApiInstance.sendTransacEmail).toHaveBeenCalled();
    });

    it('should include current year in footer', async () => {
      await brevoServiceConfigured.sendWelcomeEmail(
        'user@example.com',
        'Test User',
        'Test Org',
      );

      expect(mockApiInstance.sendTransacEmail).toHaveBeenCalled();
    });
  });

  describe('currency and date formatting', () => {
    let brevoServiceConfigured: BrevoService;

    beforeEach(async () => {
      const mockConfigServiceConfigured = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'BREVO_API_KEY') return 'test-api-key';
          if (key === 'BREVO_SENDER_EMAIL') return 'noreply@stockflow.com';
          if (key === 'BREVO_SENDER_NAME') return 'StockFlow';
          if (key === 'app.frontendUrl') return 'https://app.stockflow.com';
          return undefined;
        }),
      };

      const MockTransactionalEmailsApi =
        Brevo.TransactionalEmailsApi as jest.Mock;
      mockApiInstance = {
        sendTransacEmail: jest.fn().mockResolvedValue(mockSendResult),
        setApiKey: jest.fn(),
      };
      MockTransactionalEmailsApi.mockImplementation(() => mockApiInstance);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BrevoService,
          { provide: ConfigService, useValue: mockConfigServiceConfigured },
        ],
      }).compile();

      brevoServiceConfigured = module.get<BrevoService>(BrevoService);
    });

    it('should format currency values correctly', async () => {
      await brevoServiceConfigured.sendInvoiceEmail(
        'customer@example.com',
        'Jane Customer',
        'INV-001',
        1234.56,
        new Date('2024-02-15'),
        'Acme Corp',
      );

      expect(mockApiInstance.sendTransacEmail).toHaveBeenCalled();
    });

    it('should format dates correctly', async () => {
      await brevoServiceConfigured.sendInvoiceEmail(
        'customer@example.com',
        'Jane Customer',
        'INV-001',
        1000,
        new Date('2024-02-15'),
        'Acme Corp',
      );

      expect(mockApiInstance.sendTransacEmail).toHaveBeenCalled();
    });
  });
});

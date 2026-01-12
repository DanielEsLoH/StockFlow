import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailService, SendMailOptions } from './mail.service';

describe('MailService', () => {
  let service: MailService;
  let mailerService: jest.Mocked<MailerService>;
  let configService: jest.Mocked<ConfigService>;

  // Test data
  const mockSendMailOptions: SendMailOptions = {
    to: 'test@example.com',
    subject: 'Test Subject',
    template: 'test-template',
    context: { name: 'Test User' },
  };

  const mockSendMailResult = {
    messageId: 'msg-123',
    accepted: ['test@example.com'],
    rejected: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const mockMailerService = {
      sendMail: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: MailerService, useValue: mockMailerService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    mailerService = module.get(MailerService);
    configService = module.get(ConfigService);

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

    it('should log warning when mail is not configured', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      const mockConfigServiceNotConfigured = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'mail.host') return undefined;
          if (key === 'mail.from') return undefined;
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: MailerService, useValue: { sendMail: jest.fn() } },
          { provide: ConfigService, useValue: mockConfigServiceNotConfigured },
        ],
      }).compile();

      module.get<MailService>(MailService);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mail service is not configured'),
      );
    });

    it('should log success when mail is configured', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      const mockConfigServiceConfigured = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'mail.host') return 'smtp.example.com';
          if (key === 'mail.from') return 'noreply@example.com';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: MailerService, useValue: { sendMail: jest.fn() } },
          { provide: ConfigService, useValue: mockConfigServiceConfigured },
        ],
      }).compile();

      module.get<MailService>(MailService);

      expect(logSpy).toHaveBeenCalledWith(
        'Mail service initialized successfully',
      );
    });

    it('should use default from address when not configured', async () => {
      const mockConfigServiceNoFrom = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'mail.host') return 'smtp.example.com';
          if (key === 'mail.from') return undefined;
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: MailerService, useValue: { sendMail: jest.fn() } },
          { provide: ConfigService, useValue: mockConfigServiceNoFrom },
        ],
      }).compile();

      const mailService = module.get<MailService>(MailService);
      expect(mailService).toBeDefined();
    });
  });

  describe('isConfigured', () => {
    it('should return false when mail host is not set', async () => {
      const mockConfigServiceNotConfigured = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'mail.host') return undefined;
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: MailerService, useValue: { sendMail: jest.fn() } },
          { provide: ConfigService, useValue: mockConfigServiceNotConfigured },
        ],
      }).compile();

      const mailService = module.get<MailService>(MailService);

      expect(mailService.isConfigured()).toBe(false);
    });

    it('should return true when mail host is set', async () => {
      const mockConfigServiceConfigured = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'mail.host') return 'smtp.example.com';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: MailerService, useValue: { sendMail: jest.fn() } },
          { provide: ConfigService, useValue: mockConfigServiceConfigured },
        ],
      }).compile();

      const mailService = module.get<MailService>(MailService);

      expect(mailService.isConfigured()).toBe(true);
    });
  });

  describe('sendMail', () => {
    describe('when mail is not configured', () => {
      let mailServiceNotConfigured: MailService;

      beforeEach(async () => {
        const mockConfigServiceNotConfigured = {
          get: jest.fn().mockImplementation((key: string) => {
            if (key === 'mail.host') return undefined;
            return undefined;
          }),
        };

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            MailService,
            { provide: MailerService, useValue: { sendMail: jest.fn() } },
            { provide: ConfigService, useValue: mockConfigServiceNotConfigured },
          ],
        }).compile();

        mailServiceNotConfigured = module.get<MailService>(MailService);
      });

      it('should return success with special messageId when not configured', async () => {
        const result = await mailServiceNotConfigured.sendMail(mockSendMailOptions);

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('mail-not-configured');
      });

      it('should log debug message when not configured', async () => {
        const debugSpy = jest.spyOn(Logger.prototype, 'debug');

        await mailServiceNotConfigured.sendMail(mockSendMailOptions);

        expect(debugSpy).toHaveBeenCalledWith(
          expect.stringContaining('Mail not configured'),
        );
      });

      it('should handle array of recipients in not configured log', async () => {
        const debugSpy = jest.spyOn(Logger.prototype, 'debug');

        await mailServiceNotConfigured.sendMail({
          ...mockSendMailOptions,
          to: ['user1@example.com', 'user2@example.com'],
        });

        expect(debugSpy).toHaveBeenCalledWith(
          expect.stringContaining('user1@example.com, user2@example.com'),
        );
      });
    });

    describe('when mail is configured', () => {
      let mailServiceConfigured: MailService;
      let mailerServiceMock: jest.Mocked<MailerService>;

      beforeEach(async () => {
        const mockConfigServiceConfigured = {
          get: jest.fn().mockImplementation((key: string) => {
            if (key === 'mail.host') return 'smtp.example.com';
            if (key === 'mail.from') return 'noreply@example.com';
            return undefined;
          }),
        };

        mailerServiceMock = {
          sendMail: jest.fn().mockResolvedValue(mockSendMailResult),
        } as unknown as jest.Mocked<MailerService>;

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            MailService,
            { provide: MailerService, useValue: mailerServiceMock },
            { provide: ConfigService, useValue: mockConfigServiceConfigured },
          ],
        }).compile();

        mailServiceConfigured = module.get<MailService>(MailService);
      });

      it('should send email successfully', async () => {
        const result = await mailServiceConfigured.sendMail(mockSendMailOptions);

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('msg-123');
      });

      it('should call mailerService.sendMail with correct parameters', async () => {
        await mailServiceConfigured.sendMail(mockSendMailOptions);

        expect(mailerServiceMock.sendMail).toHaveBeenCalledWith({
          to: 'test@example.com',
          from: 'noreply@example.com',
          replyTo: undefined,
          subject: 'Test Subject',
          template: 'test-template',
          context: { name: 'Test User' },
          attachments: undefined,
        });
      });

      it('should use custom from address when provided', async () => {
        await mailServiceConfigured.sendMail({
          ...mockSendMailOptions,
          from: 'custom@example.com',
        });

        expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            from: 'custom@example.com',
          }),
        );
      });

      it('should include replyTo when provided', async () => {
        await mailServiceConfigured.sendMail({
          ...mockSendMailOptions,
          replyTo: 'reply@example.com',
        });

        expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            replyTo: 'reply@example.com',
          }),
        );
      });

      it('should include attachments when provided', async () => {
        const attachments = [
          { filename: 'test.pdf', content: 'base64content' },
        ];

        await mailServiceConfigured.sendMail({
          ...mockSendMailOptions,
          attachments,
        });

        expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            attachments,
          }),
        );
      });

      it('should log success message with messageId', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');

        await mailServiceConfigured.sendMail(mockSendMailOptions);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Email sent successfully'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('msg-123'),
        );
      });

      it('should handle array recipients in success log', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');

        await mailServiceConfigured.sendMail({
          ...mockSendMailOptions,
          to: ['user1@example.com', 'user2@example.com'],
        });

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('user1@example.com, user2@example.com'),
        );
      });

      it('should handle missing messageId in result', async () => {
        mailerServiceMock.sendMail.mockResolvedValue({});
        const logSpy = jest.spyOn(Logger.prototype, 'log');

        await mailServiceConfigured.sendMail(mockSendMailOptions);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('unknown'),
        );
      });
    });

    describe('retry logic on transient failures', () => {
      let mailServiceConfigured: MailService;
      let mailerServiceMock: jest.Mocked<MailerService>;

      beforeEach(async () => {
        const mockConfigServiceConfigured = {
          get: jest.fn().mockImplementation((key: string) => {
            if (key === 'mail.host') return 'smtp.example.com';
            if (key === 'mail.from') return 'noreply@example.com';
            return undefined;
          }),
        };

        mailerServiceMock = {
          sendMail: jest.fn(),
        } as unknown as jest.Mocked<MailerService>;

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            MailService,
            { provide: MailerService, useValue: mailerServiceMock },
            { provide: ConfigService, useValue: mockConfigServiceConfigured },
          ],
        }).compile();

        mailServiceConfigured = module.get<MailService>(MailService);
      });

      it('should retry on ECONNRESET error', async () => {
        const retryableError = new Error('ECONNRESET');
        mailerServiceMock.sendMail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendMailResult);

        const resultPromise = mailServiceConfigured.sendMail(mockSendMailOptions);

        // Advance through the retry delay
        await jest.advanceTimersByTimeAsync(1000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
        expect(mailerServiceMock.sendMail).toHaveBeenCalledTimes(2);
      });

      it('should retry on ETIMEDOUT error', async () => {
        const retryableError = new Error('ETIMEDOUT');
        mailerServiceMock.sendMail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendMailResult);

        const resultPromise = mailServiceConfigured.sendMail(mockSendMailOptions);

        await jest.advanceTimersByTimeAsync(1000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
        expect(mailerServiceMock.sendMail).toHaveBeenCalledTimes(2);
      });

      it('should retry on ECONNREFUSED error', async () => {
        const retryableError = new Error('ECONNREFUSED');
        mailerServiceMock.sendMail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendMailResult);

        const resultPromise = mailServiceConfigured.sendMail(mockSendMailOptions);

        await jest.advanceTimersByTimeAsync(1000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
      });

      it('should retry on socket hang up error', async () => {
        const retryableError = new Error('socket hang up');
        mailerServiceMock.sendMail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendMailResult);

        const resultPromise = mailServiceConfigured.sendMail(mockSendMailOptions);

        await jest.advanceTimersByTimeAsync(1000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
      });

      it('should retry on connection timeout error', async () => {
        const retryableError = new Error('connection timeout');
        mailerServiceMock.sendMail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendMailResult);

        const resultPromise = mailServiceConfigured.sendMail(mockSendMailOptions);

        await jest.advanceTimersByTimeAsync(1000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
      });

      it('should retry on 421 service unavailable error', async () => {
        const retryableError = new Error('421 Service not available');
        mailerServiceMock.sendMail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendMailResult);

        const resultPromise = mailServiceConfigured.sendMail(mockSendMailOptions);

        await jest.advanceTimersByTimeAsync(1000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
      });

      it('should retry on error with ECONNRESET code', async () => {
        const retryableError = new Error('Connection error') as NodeJS.ErrnoException;
        retryableError.code = 'ECONNRESET';
        mailerServiceMock.sendMail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendMailResult);

        const resultPromise = mailServiceConfigured.sendMail(mockSendMailOptions);

        await jest.advanceTimersByTimeAsync(1000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
      });

      it('should use exponential backoff for delays', async () => {
        const retryableError = new Error('ECONNRESET');
        mailerServiceMock.sendMail
          .mockRejectedValueOnce(retryableError)
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendMailResult);

        const resultPromise = mailServiceConfigured.sendMail(mockSendMailOptions);

        // First retry after 1000ms
        await jest.advanceTimersByTimeAsync(1000);
        // Second retry after 2000ms (exponential backoff)
        await jest.advanceTimersByTimeAsync(2000);

        const result = await resultPromise;

        expect(result.success).toBe(true);
        expect(mailerServiceMock.sendMail).toHaveBeenCalledTimes(3);
      });

      it('should log warning on retry attempts', async () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        const retryableError = new Error('ECONNRESET');
        mailerServiceMock.sendMail
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValueOnce(mockSendMailResult);

        const resultPromise = mailServiceConfigured.sendMail(mockSendMailOptions);

        await jest.advanceTimersByTimeAsync(1000);
        await resultPromise;

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('attempt 1/3'),
        );
      });
    });

    describe('failure after max retries', () => {
      let mailServiceConfigured: MailService;
      let mailerServiceMock: jest.Mocked<MailerService>;

      beforeEach(async () => {
        const mockConfigServiceConfigured = {
          get: jest.fn().mockImplementation((key: string) => {
            if (key === 'mail.host') return 'smtp.example.com';
            if (key === 'mail.from') return 'noreply@example.com';
            return undefined;
          }),
        };

        mailerServiceMock = {
          sendMail: jest.fn(),
        } as unknown as jest.Mocked<MailerService>;

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            MailService,
            { provide: MailerService, useValue: mailerServiceMock },
            { provide: ConfigService, useValue: mockConfigServiceConfigured },
          ],
        }).compile();

        mailServiceConfigured = module.get<MailService>(MailService);
      });

      it('should fail after max retries exceeded', async () => {
        const retryableError = new Error('ECONNRESET');
        mailerServiceMock.sendMail.mockRejectedValue(retryableError);

        const resultPromise = mailServiceConfigured.sendMail(mockSendMailOptions);

        // Advance through all retry delays
        await jest.advanceTimersByTimeAsync(1000);
        await jest.advanceTimersByTimeAsync(2000);

        const result = await resultPromise;

        expect(result.success).toBe(false);
        expect(result.error).toBe('ECONNRESET');
        expect(mailerServiceMock.sendMail).toHaveBeenCalledTimes(3);
      });

      it('should log error after final failure', async () => {
        const errorSpy = jest.spyOn(Logger.prototype, 'error');
        const retryableError = new Error('ECONNRESET');
        mailerServiceMock.sendMail.mockRejectedValue(retryableError);

        const resultPromise = mailServiceConfigured.sendMail(mockSendMailOptions);

        await jest.advanceTimersByTimeAsync(1000);
        await jest.advanceTimersByTimeAsync(2000);
        await resultPromise;

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to send email'),
          expect.any(String),
        );
      });

      it('should not retry on non-retryable errors', async () => {
        const nonRetryableError = new Error('Invalid recipient');
        mailerServiceMock.sendMail.mockRejectedValue(nonRetryableError);

        const result = await mailServiceConfigured.sendMail(mockSendMailOptions);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid recipient');
        expect(mailerServiceMock.sendMail).toHaveBeenCalledTimes(1);
      });

      it('should handle non-Error objects in catch', async () => {
        mailerServiceMock.sendMail.mockRejectedValue('string error');

        const result = await mailServiceConfigured.sendMail(mockSendMailOptions);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown error');
      });

      it('should not retry non-Error thrown values', async () => {
        mailerServiceMock.sendMail.mockRejectedValue({ code: 'CUSTOM' });

        const result = await mailServiceConfigured.sendMail(mockSendMailOptions);

        expect(result.success).toBe(false);
        expect(mailerServiceMock.sendMail).toHaveBeenCalledTimes(1);
      });

      it('should handle error without stack trace in log', async () => {
        const errorSpy = jest.spyOn(Logger.prototype, 'error');
        mailerServiceMock.sendMail.mockRejectedValue('non-error value');

        await mailServiceConfigured.sendMail(mockSendMailOptions);

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to send email'),
          undefined,
        );
      });

      it('should handle array recipients in error log', async () => {
        const errorSpy = jest.spyOn(Logger.prototype, 'error');
        mailerServiceMock.sendMail.mockRejectedValue(new Error('Send failed'));

        await mailServiceConfigured.sendMail({
          ...mockSendMailOptions,
          to: ['user1@example.com', 'user2@example.com'],
        });

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('user1@example.com, user2@example.com'),
          expect.any(String),
        );
      });
    });
  });

  describe('convenience methods', () => {
    let mailServiceConfigured: MailService;
    let mailerServiceMock: jest.Mocked<MailerService>;

    beforeEach(async () => {
      const mockConfigServiceConfigured = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'mail.host') return 'smtp.example.com';
          if (key === 'mail.from') return 'noreply@example.com';
          if (key === 'app.frontendUrl') return 'https://app.stockflow.com';
          return undefined;
        }),
      };

      mailerServiceMock = {
        sendMail: jest.fn().mockResolvedValue(mockSendMailResult),
      } as unknown as jest.Mocked<MailerService>;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: MailerService, useValue: mailerServiceMock },
          { provide: ConfigService, useValue: mockConfigServiceConfigured },
        ],
      }).compile();

      mailServiceConfigured = module.get<MailService>(MailService);
    });

    describe('sendWelcome', () => {
      it('should send welcome email with correct parameters', async () => {
        const result = await mailServiceConfigured.sendWelcome(
          'user@example.com',
          'John Doe',
          'Acme Corp',
        );

        expect(result.success).toBe(true);
        expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'user@example.com',
            subject: 'Welcome to StockFlow, John Doe!',
            template: 'welcome',
            context: expect.objectContaining({
              userName: 'John Doe',
              tenantName: 'Acme Corp',
              loginUrl: 'https://app.stockflow.com/login',
              supportEmail: 'support@stockflow.com',
              year: new Date().getFullYear(),
            }),
          }),
        );
      });
    });

    describe('sendLowStockAlert', () => {
      it('should send low stock alert with single recipient', async () => {
        const products = [
          { sku: 'SKU-001', name: 'Product 1', currentStock: 5, minStock: 10 },
        ];

        const result = await mailServiceConfigured.sendLowStockAlert(
          'admin@example.com',
          'Acme Corp',
          products,
        );

        expect(result.success).toBe(true);
        expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'admin@example.com',
            subject: '[StockFlow] Low Stock Alert - 1 product(s) need attention',
            template: 'low-stock-alert',
            context: expect.objectContaining({
              tenantName: 'Acme Corp',
              products,
              productCount: 1,
              dashboardUrl: 'https://app.stockflow.com/products',
            }),
          }),
        );
      });

      it('should send low stock alert with multiple recipients', async () => {
        const products = [
          { sku: 'SKU-001', name: 'Product 1', currentStock: 5, minStock: 10 },
          { sku: 'SKU-002', name: 'Product 2', currentStock: 2, minStock: 5 },
        ];

        await mailServiceConfigured.sendLowStockAlert(
          ['admin1@example.com', 'admin2@example.com'],
          'Acme Corp',
          products,
        );

        expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: ['admin1@example.com', 'admin2@example.com'],
            subject: '[StockFlow] Low Stock Alert - 2 product(s) need attention',
          }),
        );
      });
    });

    describe('sendInvoiceSent', () => {
      it('should send invoice sent email with due date', async () => {
        // Use UTC date to avoid timezone issues
        const dueDate = new Date(Date.UTC(2024, 1, 15, 12, 0, 0));

        const result = await mailServiceConfigured.sendInvoiceSent(
          'customer@example.com',
          'Jane Doe',
          'INV-001',
          1500.50,
          dueDate,
          'Acme Corp',
        );

        expect(result.success).toBe(true);
        expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'customer@example.com',
            subject: 'Invoice INV-001 from Acme Corp',
            template: 'invoice-sent',
            context: expect.objectContaining({
              customerName: 'Jane Doe',
              invoiceNumber: 'INV-001',
              total: '$1,500.50',
              dueDate: expect.any(String), // Timezone-dependent, just verify it's a string
              tenantName: 'Acme Corp',
            }),
          }),
        );
      });

      it('should send invoice sent email with null due date', async () => {
        await mailServiceConfigured.sendInvoiceSent(
          'customer@example.com',
          'Jane Doe',
          'INV-001',
          1500.50,
          null,
          'Acme Corp',
        );

        expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            context: expect.objectContaining({
              dueDate: 'Upon receipt',
            }),
          }),
        );
      });
    });

    describe('sendOverdueInvoice', () => {
      it('should send overdue invoice email', async () => {
        // Use UTC noon to avoid timezone issues
        const dueDate = new Date(Date.UTC(2024, 0, 1, 12, 0, 0));

        const result = await mailServiceConfigured.sendOverdueInvoice(
          'customer@example.com',
          'Jane Doe',
          'INV-001',
          1500.50,
          dueDate,
          15,
          'Acme Corp',
        );

        expect(result.success).toBe(true);
        expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'customer@example.com',
            subject: '[Reminder] Invoice INV-001 is 15 day(s) overdue',
            template: 'overdue-invoice',
            context: expect.objectContaining({
              customerName: 'Jane Doe',
              invoiceNumber: 'INV-001',
              total: '$1,500.50',
              dueDate: expect.any(String), // Timezone-dependent, just verify it's a string
              daysOverdue: 15,
              tenantName: 'Acme Corp',
            }),
          }),
        );
      });
    });

    describe('sendPaymentReceived', () => {
      it('should send payment received email with remaining balance', async () => {
        const result = await mailServiceConfigured.sendPaymentReceived(
          'customer@example.com',
          'Jane Doe',
          'INV-001',
          500.00,
          'CREDIT_CARD',
          1000.00,
          'Acme Corp',
        );

        expect(result.success).toBe(true);
        expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'customer@example.com',
            subject: 'Payment Received - Invoice INV-001',
            template: 'payment-received',
            context: expect.objectContaining({
              customerName: 'Jane Doe',
              invoiceNumber: 'INV-001',
              paymentAmount: '$500.00',
              paymentMethod: 'Credit Card',
              remainingBalance: '$1,000.00',
              isPaidInFull: false,
              tenantName: 'Acme Corp',
            }),
          }),
        );
      });

      it('should send payment received email when paid in full', async () => {
        await mailServiceConfigured.sendPaymentReceived(
          'customer@example.com',
          'Jane Doe',
          'INV-001',
          1500.00,
          'BANK_TRANSFER',
          0,
          'Acme Corp',
        );

        expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            context: expect.objectContaining({
              isPaidInFull: true,
              paymentMethod: 'Bank Transfer',
            }),
          }),
        );
      });

      it('should format all payment methods correctly', async () => {
        const paymentMethods = [
          { input: 'CASH', expected: 'Cash' },
          { input: 'CREDIT_CARD', expected: 'Credit Card' },
          { input: 'DEBIT_CARD', expected: 'Debit Card' },
          { input: 'BANK_TRANSFER', expected: 'Bank Transfer' },
          { input: 'CHECK', expected: 'Check' },
          { input: 'OTHER', expected: 'Other' },
          { input: 'UNKNOWN_METHOD', expected: 'UNKNOWN_METHOD' },
        ];

        for (const { input, expected } of paymentMethods) {
          await mailServiceConfigured.sendPaymentReceived(
            'customer@example.com',
            'Jane Doe',
            'INV-001',
            100.00,
            input,
            0,
            'Acme Corp',
          );

          expect(mailerServiceMock.sendMail).toHaveBeenLastCalledWith(
            expect.objectContaining({
              context: expect.objectContaining({
                paymentMethod: expected,
              }),
            }),
          );
        }
      });
    });
  });
});
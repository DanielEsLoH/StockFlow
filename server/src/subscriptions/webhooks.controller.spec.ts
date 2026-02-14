import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { SubscriptionsService } from './subscriptions.service';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let subscriptionsService: jest.Mocked<SubscriptionsService>;

  beforeEach(async () => {
    const mockSubscriptionsService = {
      handleWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    subscriptionsService = module.get(SubscriptionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWompiWebhook', () => {
    it('should process a valid webhook and return received: true', async () => {
      const webhookBody = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'tx-12345',
            status: 'APPROVED',
            reference: 'ref-abc',
            amount_in_cents: 21990000,
            currency: 'COP',
            customer_email: 'test@example.com',
          },
        },
        signature: {
          checksum: 'valid-checksum-hash',
          properties: ['transaction.id', 'transaction.status'],
        },
        timestamp: 1700000000,
        sent_at: '2024-01-15T10:00:00.000Z',
      };

      subscriptionsService.handleWebhook.mockResolvedValue(undefined);

      const result = await controller.handleWompiWebhook(webhookBody);

      expect(result).toEqual({ received: true });
      expect(subscriptionsService.handleWebhook).toHaveBeenCalledWith(
        webhookBody,
      );
      expect(subscriptionsService.handleWebhook).toHaveBeenCalledTimes(1);
    });

    it('should handle webhook with DECLINED transaction', async () => {
      const webhookBody = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'tx-67890',
            status: 'DECLINED',
            reference: 'ref-def',
            amount_in_cents: 14990000,
            currency: 'COP',
          },
        },
        signature: {
          checksum: 'another-checksum',
        },
      };

      subscriptionsService.handleWebhook.mockResolvedValue(undefined);

      const result = await controller.handleWompiWebhook(webhookBody);

      expect(result).toEqual({ received: true });
      expect(subscriptionsService.handleWebhook).toHaveBeenCalledWith(
        webhookBody,
      );
    });

    it('should propagate errors from subscriptionsService.handleWebhook', async () => {
      const webhookBody = {
        event: 'transaction.updated',
        data: { transaction: { id: 'tx-bad' } },
        signature: { checksum: 'invalid' },
      };

      subscriptionsService.handleWebhook.mockRejectedValue(
        new Error('Invalid signature'),
      );

      await expect(
        controller.handleWompiWebhook(webhookBody),
      ).rejects.toThrow('Invalid signature');
    });

    it('should handle empty body', async () => {
      subscriptionsService.handleWebhook.mockResolvedValue(undefined);

      const result = await controller.handleWompiWebhook({});

      expect(result).toEqual({ received: true });
      expect(subscriptionsService.handleWebhook).toHaveBeenCalledWith({});
    });

    it('should handle null body properties', async () => {
      const webhookBody = {
        event: null,
        data: null,
        signature: null,
      };

      subscriptionsService.handleWebhook.mockResolvedValue(undefined);

      const result = await controller.handleWompiWebhook(webhookBody);

      expect(result).toEqual({ received: true });
    });

    it('should handle webhook with VOIDED transaction', async () => {
      const webhookBody = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'tx-void',
            status: 'VOIDED',
            reference: 'ref-void',
          },
        },
        signature: { checksum: 'void-checksum' },
      };

      subscriptionsService.handleWebhook.mockResolvedValue(undefined);

      const result = await controller.handleWompiWebhook(webhookBody);

      expect(result).toEqual({ received: true });
    });

    it('should handle webhook with ERROR transaction', async () => {
      const webhookBody = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'tx-error',
            status: 'ERROR',
            reference: 'ref-error',
          },
        },
        signature: { checksum: 'error-checksum' },
      };

      subscriptionsService.handleWebhook.mockResolvedValue(undefined);

      const result = await controller.handleWompiWebhook(webhookBody);

      expect(result).toEqual({ received: true });
      expect(subscriptionsService.handleWebhook).toHaveBeenCalledWith(
        webhookBody,
      );
    });
  });
});

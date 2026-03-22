import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { MercadoLibreConnector } from './mercadolibre.connector';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchResponse(
  body: unknown,
  options: { ok?: boolean; status?: number } = {},
) {
  const { ok = true, status = 200 } = options;
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const ACCESS_TOKEN = 'APP_USR-meli-token-123';
const SELLER_ID = 123456789;
const BASE_URL = 'https://api.mercadolibre.com';

const meliItem = {
  code: 200,
  body: {
    id: 'MCO-12345',
    title: 'Teclado Mecanico RGB',
    price: 189000,
    available_quantity: 25,
    thumbnail: 'https://http2.mlstatic.com/teclado.jpg',
    permalink: 'https://articulo.mercadolibre.com.co/MCO-12345',
    seller_custom_field: 'TEC-RGB-001',
  },
};

const meliItemFailed = {
  code: 404,
  body: null,
};

const meliOrder = {
  id: 800100200,
  buyer: {
    first_name: 'Maria',
    last_name: 'Rodriguez',
    email: 'maria@example.com',
  },
  order_items: [
    {
      item: {
        id: 'MCO-12345',
        title: 'Teclado Mecanico RGB',
        seller_sku: 'TEC-RGB-001',
      },
      quantity: 1,
      unit_price: 189000,
    },
  ],
  total_amount: 189000,
  currency_id: 'COP',
  date_created: '2026-02-15T10:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('MercadoLibreConnector', () => {
  let connector: MercadoLibreConnector;
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MercadoLibreConnector],
    }).compile();

    connector = module.get<MercadoLibreConnector>(MercadoLibreConnector);

    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(mockFetchResponse({}));
  });

  it('should be defined and expose MERCADOLIBRE platform', () => {
    expect(connector).toBeDefined();
    expect(connector.platform).toBe('MERCADOLIBRE');
  });

  // -------------------------------------------------------------------------
  // verifyConnection
  // -------------------------------------------------------------------------

  describe('verifyConnection', () => {
    it('should return true when /users/me responds ok', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ id: SELLER_ID }));

      const result = await connector.verifyConnection(ACCESS_TOKEN);

      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(`${BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      });
    });

    it('should return false when /users/me responds with 401', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({}, { ok: false, status: 401 }),
      );

      const result = await connector.verifyConnection(ACCESS_TOKEN);

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('DNS resolution failed'));

      const result = await connector.verifyConnection(ACCESS_TOKEN);

      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // fetchProducts
  // -------------------------------------------------------------------------

  describe('fetchProducts', () => {
    it('should fetch seller ID, item IDs, then item details', async () => {
      // 1. /users/me
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ id: SELLER_ID }));
      // 2. /users/{id}/items/search
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ results: ['MCO-12345'] }),
      );
      // 3. /items?ids=MCO-12345
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([meliItem]));

      const products = await connector.fetchProducts(ACCESS_TOKEN);

      expect(products).toHaveLength(1);
      expect(products[0]).toEqual({
        externalId: 'MCO-12345',
        sku: 'TEC-RGB-001',
        name: 'Teclado Mecanico RGB',
        description: null,
        price: 189000,
        stock: 25,
        imageUrl: 'https://http2.mlstatic.com/teclado.jpg',
        url: 'https://articulo.mercadolibre.com.co/MCO-12345',
      });
    });

    it('should skip items with non-200 response codes in batch', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ id: SELLER_ID }));
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ results: ['MCO-12345', 'MCO-99999'] }),
      );
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse([meliItem, meliItemFailed]),
      );

      const products = await connector.fetchProducts(ACCESS_TOKEN);

      expect(products).toHaveLength(1);
      expect(products[0].externalId).toBe('MCO-12345');
    });

    it('should return empty array when /users/me fails', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({}, { ok: false, status: 401 }),
      );

      const products = await connector.fetchProducts(ACCESS_TOKEN);

      expect(products).toEqual([]);
    });

    it('should return empty array when items search fails', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ id: SELLER_ID }));
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({}, { ok: false, status: 500 }),
      );

      const products = await connector.fetchProducts(ACCESS_TOKEN);

      expect(products).toEqual([]);
    });

    it('should return empty array when no items are listed', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ id: SELLER_ID }));
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ results: [] }));

      const products = await connector.fetchProducts(ACCESS_TOKEN);

      expect(products).toEqual([]);
    });

    it('should continue processing remaining batches when one batch fails', async () => {
      // Generate 25 item IDs to trigger 2 batches (20 + 5)
      const itemIds = Array.from({ length: 25 }, (_, i) => `MCO-${i}`);

      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ id: SELLER_ID }));
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ results: itemIds }));
      // First batch (20 items) fails
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({}, { ok: false, status: 500 }),
      );
      // Second batch (5 items) succeeds
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([meliItem]));

      const products = await connector.fetchProducts(ACCESS_TOKEN);

      // Only item from the second batch
      expect(products).toHaveLength(1);
    });

    it('should return empty array on network error', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('timeout'));

      const products = await connector.fetchProducts(ACCESS_TOKEN);

      expect(products).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // fetchOrders
  // -------------------------------------------------------------------------

  describe('fetchOrders', () => {
    it('should fetch seller ID then orders and transform correctly', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ id: SELLER_ID }));
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ results: [meliOrder] }),
      );

      const orders = await connector.fetchOrders(ACCESS_TOKEN);

      expect(orders).toHaveLength(1);
      expect(orders[0]).toEqual({
        externalId: '800100200',
        orderNumber: 'ML-800100200',
        customerName: 'Maria Rodriguez',
        customerEmail: 'maria@example.com',
        items: [
          {
            externalProductId: 'MCO-12345',
            sku: 'TEC-RGB-001',
            name: 'Teclado Mecanico RGB',
            quantity: 1,
            unitPrice: 189000,
          },
        ],
        total: 189000,
        currency: 'COP',
        createdAt: new Date('2026-02-15T10:00:00.000Z'),
      });
    });

    it('should include date_created.from param when since is provided', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ id: SELLER_ID }));
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ results: [] }));

      const since = new Date('2026-01-01T00:00:00.000Z');
      await connector.fetchOrders(ACCESS_TOKEN, undefined, since);

      const ordersUrl = fetchSpy.mock.calls[1][0] as string;
      expect(ordersUrl).toContain(
        `&order.date_created.from=${since.toISOString()}`,
      );
    });

    it('should return empty array when /users/me fails', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({}, { ok: false, status: 401 }),
      );

      const orders = await connector.fetchOrders(ACCESS_TOKEN);

      expect(orders).toEqual([]);
    });

    it('should return empty array when orders endpoint fails', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ id: SELLER_ID }));
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({}, { ok: false, status: 500 }),
      );

      const orders = await connector.fetchOrders(ACCESS_TOKEN);

      expect(orders).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('ENOTFOUND'));

      const orders = await connector.fetchOrders(ACCESS_TOKEN);

      expect(orders).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // pushInventory
  // -------------------------------------------------------------------------

  describe('pushInventory', () => {
    it('should PUT available_quantity to the items endpoint', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({}));

      await connector.pushInventory(ACCESS_TOKEN, 'MCO-12345', 30);

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/items/MCO-12345`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ available_quantity: 30 }),
        }),
      );
    });

    it('should handle network error gracefully', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('connection refused'));

      await expect(
        connector.pushInventory(ACCESS_TOKEN, 'MCO-12345', 10),
      ).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // verifyWebhook
  // -------------------------------------------------------------------------

  describe('verifyWebhook', () => {
    const webhookSecret = 'meli_webhook_secret_123';

    it('should return true for a valid HMAC-SHA256 hex signature', () => {
      const payload = '{"resource":"/items/MCO-12345"}';
      const expectedHmac = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      const result = connector.verifyWebhook(
        payload,
        expectedHmac,
        webhookSecret,
      );

      expect(result).toBe(true);
    });

    it('should return false for an invalid signature', () => {
      const payload = '{"resource":"/items/MCO-12345"}';
      // Produce a hex string of the same length (64 chars for sha256 hex)
      const wrongHmac = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(payload)
        .digest('hex');

      const result = connector.verifyWebhook(payload, wrongHmac, webhookSecret);

      expect(result).toBe(false);
    });

    it('should work with Buffer payloads', () => {
      const payload = Buffer.from('{"topic":"orders"}');
      const expectedHmac = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      const result = connector.verifyWebhook(
        payload,
        expectedHmac,
        webhookSecret,
      );

      expect(result).toBe(true);
    });
  });
});

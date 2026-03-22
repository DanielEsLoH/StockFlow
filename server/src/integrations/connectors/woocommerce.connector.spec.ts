import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { WooCommerceConnector } from './woocommerce.connector';

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

const SHOP_URL = 'https://my-woo-store.com';
const CONSUMER_KEY = 'ck_live_abc123';
const CONSUMER_SECRET = 'cs_live_xyz789';
const ACCESS_TOKEN = `${CONSUMER_KEY}:${CONSUMER_SECRET}`;
const AUTH_PARAMS = `consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`;

const wooProduct = {
  id: 401,
  name: 'USB-C Hub',
  sku: 'USB-HUB-7P',
  description: '<p>7-port USB-C hub with HDMI</p>',
  price: '45.50',
  stock_quantity: 80,
  images: [{ src: 'https://my-woo-store.com/wp-content/hub.jpg' }],
  permalink: 'https://my-woo-store.com/product/usb-c-hub',
};

const wooProductMinimal = {
  id: 402,
  name: 'Gift Card',
  sku: '',
  description: '',
  price: '',
  stock_quantity: null,
  images: [],
  permalink: 'https://my-woo-store.com/product/gift-card',
};

const wooOrder = {
  id: 5001,
  number: '5001',
  billing: {
    first_name: 'Andres',
    last_name: 'Garcia',
    email: 'andres@example.com',
  },
  line_items: [
    {
      product_id: 401,
      sku: 'USB-HUB-7P',
      name: 'USB-C Hub',
      quantity: 3,
      price: '45.50',
    },
  ],
  total: '136.50',
  currency: 'USD',
  date_created: '2026-02-20T09:15:00',
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('WooCommerceConnector', () => {
  let connector: WooCommerceConnector;
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WooCommerceConnector],
    }).compile();

    connector = module.get<WooCommerceConnector>(WooCommerceConnector);

    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(mockFetchResponse({}));
  });

  it('should be defined and expose WOOCOMMERCE platform', () => {
    expect(connector).toBeDefined();
    expect(connector.platform).toBe('WOOCOMMERCE');
  });

  // -------------------------------------------------------------------------
  // verifyConnection
  // -------------------------------------------------------------------------

  describe('verifyConnection', () => {
    it('should return true when system_status responds ok', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ environment: {} }));

      const result = await connector.verifyConnection(ACCESS_TOKEN, SHOP_URL);

      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${SHOP_URL}/wp-json/wc/v3/system_status?${AUTH_PARAMS}`,
      );
    });

    it('should return false when API responds with 401', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({}, { ok: false, status: 401 }),
      );

      const result = await connector.verifyConnection(ACCESS_TOKEN, SHOP_URL);

      expect(result).toBe(false);
    });

    it('should return false when shopUrl is not provided', async () => {
      const result = await connector.verifyConnection(ACCESS_TOKEN);

      expect(result).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should return false on network error', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await connector.verifyConnection(ACCESS_TOKEN, SHOP_URL);

      expect(result).toBe(false);
    });

    it('should correctly split consumer key and secret from access token', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({}));

      await connector.verifyConnection(ACCESS_TOKEN, SHOP_URL);

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain(`consumer_key=${CONSUMER_KEY}`);
      expect(calledUrl).toContain(`consumer_secret=${CONSUMER_SECRET}`);
    });
  });

  // -------------------------------------------------------------------------
  // fetchProducts
  // -------------------------------------------------------------------------

  describe('fetchProducts', () => {
    it('should fetch and transform products correctly', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([wooProduct]));

      const products = await connector.fetchProducts(ACCESS_TOKEN, SHOP_URL);

      expect(products).toHaveLength(1);
      expect(products[0]).toEqual({
        externalId: '401',
        sku: 'USB-HUB-7P',
        name: 'USB-C Hub',
        description: '<p>7-port USB-C hub with HDMI</p>',
        price: 45.5,
        stock: 80,
        imageUrl: 'https://my-woo-store.com/wp-content/hub.jpg',
        url: 'https://my-woo-store.com/product/usb-c-hub',
      });
    });

    it('should handle products with empty/null optional fields', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([wooProductMinimal]));

      const products = await connector.fetchProducts(ACCESS_TOKEN, SHOP_URL);

      expect(products).toHaveLength(1);
      expect(products[0]).toEqual({
        externalId: '402',
        sku: null,
        name: 'Gift Card',
        description: '',
        price: 0,
        stock: 0,
        imageUrl: null,
        url: 'https://my-woo-store.com/product/gift-card',
      });
    });

    it('should return empty array when API responds with error', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({}, { ok: false, status: 403 }),
      );

      const products = await connector.fetchProducts(ACCESS_TOKEN, SHOP_URL);

      expect(products).toEqual([]);
    });

    it('should return empty array when shopUrl is not provided', async () => {
      const products = await connector.fetchProducts(ACCESS_TOKEN);

      expect(products).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should return empty array on network error', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('socket hang up'));

      const products = await connector.fetchProducts(ACCESS_TOKEN, SHOP_URL);

      expect(products).toEqual([]);
    });

    it('should include auth params in the request URL', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([]));

      await connector.fetchProducts(ACCESS_TOKEN, SHOP_URL);

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain(AUTH_PARAMS);
      expect(calledUrl).toContain('per_page=100');
    });
  });

  // -------------------------------------------------------------------------
  // fetchOrders
  // -------------------------------------------------------------------------

  describe('fetchOrders', () => {
    it('should fetch and transform orders correctly', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([wooOrder]));

      const orders = await connector.fetchOrders(ACCESS_TOKEN, SHOP_URL);

      expect(orders).toHaveLength(1);
      expect(orders[0]).toEqual({
        externalId: '5001',
        orderNumber: 'WC-5001',
        customerName: 'Andres Garcia',
        customerEmail: 'andres@example.com',
        items: [
          {
            externalProductId: '401',
            sku: 'USB-HUB-7P',
            name: 'USB-C Hub',
            quantity: 3,
            unitPrice: 45.5,
          },
        ],
        total: 136.5,
        currency: 'USD',
        createdAt: new Date('2026-02-20T09:15:00'),
      });
    });

    it('should append after param when since is provided', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([]));

      const since = new Date('2026-01-15T00:00:00.000Z');
      await connector.fetchOrders(ACCESS_TOKEN, SHOP_URL, since);

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain(`&after=${since.toISOString()}`);
    });

    it('should return empty array when shopUrl is not provided', async () => {
      const orders = await connector.fetchOrders(ACCESS_TOKEN);

      expect(orders).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should return empty array when API responds with error', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({}, { ok: false, status: 500 }),
      );

      const orders = await connector.fetchOrders(ACCESS_TOKEN, SHOP_URL);

      expect(orders).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('request timeout'));

      const orders = await connector.fetchOrders(ACCESS_TOKEN, SHOP_URL);

      expect(orders).toEqual([]);
    });

    it('should handle line items with empty sku', async () => {
      const orderNoSku = {
        ...wooOrder,
        line_items: [{ ...wooOrder.line_items[0], sku: '' }],
      };

      fetchSpy.mockResolvedValueOnce(mockFetchResponse([orderNoSku]));

      const orders = await connector.fetchOrders(ACCESS_TOKEN, SHOP_URL);

      expect(orders[0].items[0].sku).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // pushInventory
  // -------------------------------------------------------------------------

  describe('pushInventory', () => {
    it('should PUT stock_quantity to the products endpoint', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({}));

      await connector.pushInventory(ACCESS_TOKEN, '401', 50, SHOP_URL);

      expect(fetchSpy).toHaveBeenCalledWith(
        `${SHOP_URL}/wp-json/wc/v3/products/401?${AUTH_PARAMS}`,
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock_quantity: 50 }),
        }),
      );
    });

    it('should do nothing when shopUrl is not provided', async () => {
      await connector.pushInventory(ACCESS_TOKEN, '401', 10);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should handle network error gracefully', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('ECONNRESET'));

      await expect(
        connector.pushInventory(ACCESS_TOKEN, '401', 10, SHOP_URL),
      ).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // verifyWebhook
  // -------------------------------------------------------------------------

  describe('verifyWebhook', () => {
    const webhookSecret = 'woo_webhook_secret_abc';

    it('should return true for a valid HMAC-SHA256 base64 signature', () => {
      const payload = '{"webhook_id":1,"action":"updated"}';
      const expectedHmac = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('base64');

      const result = connector.verifyWebhook(
        payload,
        expectedHmac,
        webhookSecret,
      );

      expect(result).toBe(true);
    });

    it('should return false for an invalid signature (length mismatch)', () => {
      const payload = '{"webhook_id":1}';
      const badSignature = 'totally-wrong';

      // WooCommerce connector wraps timingSafeEqual in try/catch, returns false
      const result = connector.verifyWebhook(
        payload,
        badSignature,
        webhookSecret,
      );

      expect(result).toBe(false);
    });

    it('should return false for wrong secret (same-length buffers)', () => {
      const payload = '{"webhook_id":1}';
      const wrongHmac = crypto
        .createHmac('sha256', 'wrong-secret-value-here')
        .update(payload)
        .digest('base64');

      const result = connector.verifyWebhook(payload, wrongHmac, webhookSecret);

      expect(result).toBe(false);
    });

    it('should work with Buffer payloads', () => {
      const payload = Buffer.from('raw-woo-webhook');
      const expectedHmac = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('base64');

      const result = connector.verifyWebhook(
        payload,
        expectedHmac,
        webhookSecret,
      );

      expect(result).toBe(true);
    });
  });
});

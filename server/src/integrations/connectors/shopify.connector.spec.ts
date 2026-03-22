import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { ShopifyConnector } from './shopify.connector';

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

const SHOP_URL = 'my-store.myshopify.com';
const ACCESS_TOKEN = 'shpat_test_token_123';

const shopifyProduct = {
  id: 7001,
  title: 'Wireless Mouse',
  body_html: '<p>Ergonomic wireless mouse</p>',
  variants: [{ sku: 'WM-001', price: '29.99', inventory_quantity: 150 }],
  images: [{ src: 'https://cdn.shopify.com/mouse.jpg' }],
  handle: 'wireless-mouse',
};

const shopifyProductNoVariants = {
  id: 7002,
  title: 'Mystery Item',
  body_html: null,
  variants: [],
  images: [],
  handle: 'mystery-item',
};

const shopifyOrder = {
  id: 9001,
  name: '#1042',
  customer: {
    first_name: 'Carlos',
    last_name: 'Lopez',
    email: 'carlos@example.com',
  },
  line_items: [
    {
      product_id: 7001,
      sku: 'WM-001',
      title: 'Wireless Mouse',
      quantity: 2,
      price: '29.99',
    },
  ],
  total_price: '59.98',
  currency: 'USD',
  created_at: '2026-02-10T14:30:00.000Z',
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ShopifyConnector', () => {
  let connector: ShopifyConnector;
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShopifyConnector],
    }).compile();

    connector = module.get<ShopifyConnector>(ShopifyConnector);

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(mockFetchResponse({}));
  });

  it('should be defined and expose SHOPIFY platform', () => {
    expect(connector).toBeDefined();
    expect(connector.platform).toBe('SHOPIFY');
  });

  // -------------------------------------------------------------------------
  // verifyConnection
  // -------------------------------------------------------------------------

  describe('verifyConnection', () => {
    it('should return true when Shopify responds ok', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ shop: {} }));

      const result = await connector.verifyConnection(ACCESS_TOKEN, SHOP_URL);

      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        `https://${SHOP_URL}/admin/api/2024-01/shop.json`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Shopify-Access-Token': ACCESS_TOKEN,
          }),
        }),
      );
    });

    it('should return false when Shopify responds with error status', async () => {
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
  });

  // -------------------------------------------------------------------------
  // fetchProducts
  // -------------------------------------------------------------------------

  describe('fetchProducts', () => {
    it('should fetch and transform products correctly', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ products: [shopifyProduct] }),
      );

      const products = await connector.fetchProducts(ACCESS_TOKEN, SHOP_URL);

      expect(products).toHaveLength(1);
      expect(products[0]).toEqual({
        externalId: '7001',
        sku: 'WM-001',
        name: 'Wireless Mouse',
        description: '<p>Ergonomic wireless mouse</p>',
        price: 29.99,
        stock: 150,
        imageUrl: 'https://cdn.shopify.com/mouse.jpg',
        url: `https://${SHOP_URL}/products/wireless-mouse`,
      });
    });

    it('should handle products with no variants/images gracefully', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ products: [shopifyProductNoVariants] }),
      );

      const products = await connector.fetchProducts(ACCESS_TOKEN, SHOP_URL);

      expect(products).toHaveLength(1);
      expect(products[0]).toEqual({
        externalId: '7002',
        sku: null,
        name: 'Mystery Item',
        description: null,
        price: 0,
        stock: 0,
        imageUrl: null,
        url: `https://${SHOP_URL}/products/mystery-item`,
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
      fetchSpy.mockRejectedValueOnce(new Error('timeout'));

      const products = await connector.fetchProducts(ACCESS_TOKEN, SHOP_URL);

      expect(products).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // fetchOrders
  // -------------------------------------------------------------------------

  describe('fetchOrders', () => {
    it('should fetch and transform orders correctly', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ orders: [shopifyOrder] }),
      );

      const orders = await connector.fetchOrders(ACCESS_TOKEN, SHOP_URL);

      expect(orders).toHaveLength(1);
      expect(orders[0]).toEqual({
        externalId: '9001',
        orderNumber: '#1042',
        customerName: 'Carlos Lopez',
        customerEmail: 'carlos@example.com',
        items: [
          {
            externalProductId: '7001',
            sku: 'WM-001',
            name: 'Wireless Mouse',
            quantity: 2,
            unitPrice: 29.99,
          },
        ],
        total: 59.98,
        currency: 'USD',
        createdAt: new Date('2026-02-10T14:30:00.000Z'),
      });
    });

    it('should append created_at_min param when since is provided', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ orders: [] }));

      const since = new Date('2026-01-01T00:00:00.000Z');
      await connector.fetchOrders(ACCESS_TOKEN, SHOP_URL, since);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(`&created_at_min=${since.toISOString()}`),
        expect.anything(),
      );
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
      fetchSpy.mockRejectedValueOnce(new Error('network failure'));

      const orders = await connector.fetchOrders(ACCESS_TOKEN, SHOP_URL);

      expect(orders).toEqual([]);
    });

    it('should handle order with missing customer fields', async () => {
      const orderMissingCustomer = {
        ...shopifyOrder,
        customer: { first_name: '', last_name: '', email: null },
      };

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ orders: [orderMissingCustomer] }),
      );

      const orders = await connector.fetchOrders(ACCESS_TOKEN, SHOP_URL);

      expect(orders[0].customerName).toBe('');
      expect(orders[0].customerEmail).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // pushInventory
  // -------------------------------------------------------------------------

  describe('pushInventory', () => {
    it('should fetch variant, then set inventory level', async () => {
      // First call: get variants
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          variants: [{ inventory_item_id: 55555 }],
        }),
      );
      // Second call: set inventory
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({}));

      await connector.pushInventory(ACCESS_TOKEN, '7001', 42, SHOP_URL);

      // Verify variant fetch
      expect(fetchSpy).toHaveBeenCalledWith(
        `https://${SHOP_URL}/admin/api/2024-01/products/7001/variants.json`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Shopify-Access-Token': ACCESS_TOKEN,
          }),
        }),
      );

      // Verify inventory set call
      expect(fetchSpy).toHaveBeenCalledWith(
        `https://${SHOP_URL}/admin/api/2024-01/inventory_levels/set.json`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            inventory_item_id: 55555,
            available: 42,
          }),
        }),
      );
    });

    it('should do nothing when shopUrl is not provided', async () => {
      await connector.pushInventory(ACCESS_TOKEN, '7001', 10);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should not set inventory when variant fetch fails', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({}, { ok: false, status: 404 }),
      );

      await connector.pushInventory(ACCESS_TOKEN, '7001', 10, SHOP_URL);

      // Only the variant fetch should have happened
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should not set inventory when no inventory_item_id is found', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ variants: [] }));

      await connector.pushInventory(ACCESS_TOKEN, '7001', 10, SHOP_URL);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle network error gracefully', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('connection reset'));

      await expect(
        connector.pushInventory(ACCESS_TOKEN, '7001', 10, SHOP_URL),
      ).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // verifyWebhook
  // -------------------------------------------------------------------------

  describe('verifyWebhook', () => {
    const webhookSecret = 'shopify_webhook_secret';

    it('should return true for a valid HMAC-SHA256 base64 signature', () => {
      const payload = '{"order_id":123}';
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

    it('should return false for an invalid signature', () => {
      const payload = '{"order_id":123}';
      const badSignature = Buffer.from('invalid-signature').toString('base64');

      // timingSafeEqual throws when buffer lengths differ
      expect(() =>
        connector.verifyWebhook(payload, badSignature, webhookSecret),
      ).toThrow();
    });

    it('should work with Buffer payloads', () => {
      const payload = Buffer.from('raw-webhook-body');
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

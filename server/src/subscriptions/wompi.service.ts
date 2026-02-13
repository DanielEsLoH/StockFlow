import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

// =============================================================================
// Interfaces
// =============================================================================

export interface WompiMerchantInfo {
  id: number;
  name: string;
  legal_name: string;
  presigned_acceptance: {
    acceptance_token: string;
    permalink: string;
    type: string;
  };
  presigned_personal_data_auth: {
    acceptance_token: string;
    permalink: string;
    type: string;
  };
}

export interface WompiPaymentSource {
  id: number;
  type: string;
  status: string;
  customer_email: string;
}

export interface WompiTransaction {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';
  reference: string;
  amount_in_cents: number;
  currency: string;
  payment_method_type: string;
  payment_source_id?: number;
  customer_email?: string;
  created_at: string;
  finalized_at?: string;
  status_message?: string;
}

export interface CreateTransactionParams {
  amountInCents: number;
  currency: string;
  customerEmail: string;
  reference: string;
  paymentSourceId?: number;
  recurrent?: boolean;
  redirectUrl?: string;
  acceptanceToken: string;
  personalAuthToken?: string;
}

interface WompiWebhookBody {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
  signature: {
    properties: string[];
    checksum: string;
  };
}

// =============================================================================
// Service
// =============================================================================

/**
 * WompiService encapsulates all communication with the Wompi payment gateway API.
 *
 * Wompi is a Colombian payment gateway that supports card payments, PSE bank
 * transfers, Nequi, and other local payment methods. This service provides
 * methods for managing payment sources, creating transactions, verifying
 * webhook signatures, and generating integrity hashes for the checkout widget.
 *
 * Configuration is driven by environment variables:
 * - WOMPI_PUBLIC_KEY: Public API key for client-facing operations
 * - WOMPI_PRIVATE_KEY: Private API key for server-side operations
 * - WOMPI_EVENT_SECRET: Secret for webhook signature verification
 * - WOMPI_INTEGRITY_SECRET: Secret for checkout widget integrity hashes
 *
 * The environment (sandbox vs production) is determined by the key prefix
 * (pub_test_ = sandbox, pub_prod_ = production).
 */
@Injectable()
export class WompiService {
  private readonly logger = new Logger(WompiService.name);
  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly eventSecret: string;
  private readonly integritySecret: string;
  private cachedMerchantInfo: WompiMerchantInfo | null = null;
  private merchantInfoCacheExpiry = 0;
  readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY') || '';
    this.privateKey = this.configService.get<string>('WOMPI_PRIVATE_KEY') || '';
    this.eventSecret =
      this.configService.get<string>('WOMPI_EVENT_SECRET') || '';
    this.integritySecret =
      this.configService.get<string>('WOMPI_INTEGRITY_SECRET') || '';

    // Determine environment from key prefix (pub_test_ / prv_test_ = sandbox)
    const isProduction =
      this.publicKey.startsWith('pub_prod_') ||
      this.privateKey.startsWith('prv_prod_');
    this.baseUrl = isProduction
      ? 'https://production.wompi.co/v1'
      : 'https://sandbox.wompi.co/v1';

    this.enabled = !!this.privateKey;

    if (!this.enabled) {
      this.logger.warn(
        'WOMPI_PRIVATE_KEY not configured - Wompi features will be disabled',
      );
    } else {
      this.logger.log(
        `Wompi service initialized (${isProduction ? 'production' : 'sandbox'})`,
      );
    }
  }

  // ===========================================================================
  // PUBLIC METHODS
  // ===========================================================================

  /**
   * Returns the Wompi public key for use by the frontend checkout widget.
   *
   * @returns The configured WOMPI_PUBLIC_KEY
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Retrieves merchant information including acceptance tokens required
   * for creating transactions and payment sources.
   *
   * Uses the public key for authentication (public endpoint).
   *
   * @returns Merchant info with presigned acceptance and personal data auth tokens
   */
  async getMerchantInfo(): Promise<WompiMerchantInfo> {
    // Cache merchant info for 5 minutes to avoid repeated API calls
    if (this.cachedMerchantInfo && Date.now() < this.merchantInfoCacheExpiry) {
      this.logger.debug('Returning cached merchant info');
      return this.cachedMerchantInfo;
    }

    this.logger.log('Fetching merchant info from Wompi');

    const response = await this.request<{ data: WompiMerchantInfo }>(
      'GET',
      `/merchants/${this.publicKey}`,
      undefined,
      'public',
    );

    this.cachedMerchantInfo = response.data;
    this.merchantInfoCacheExpiry = Date.now() + 5 * 60 * 1000;

    return response.data;
  }

  /**
   * Creates a reusable payment source from a tokenized card.
   *
   * The card token is obtained client-side via the Wompi.js SDK and then
   * sent to this method along with the acceptance tokens obtained from
   * getMerchantInfo().
   *
   * @param token - Tokenized card token from Wompi.js SDK
   * @param customerEmail - Customer's email address
   * @param acceptanceToken - Acceptance token from merchant info
   * @param personalAuthToken - Personal data authorization token (optional)
   * @returns Created payment source with ID and status
   */
  async createPaymentSource(
    token: string,
    customerEmail: string,
    acceptanceToken: string,
    personalAuthToken?: string,
  ): Promise<WompiPaymentSource> {
    this.logger.log(`Creating payment source for ${customerEmail}`);

    const body: Record<string, unknown> = {
      type: 'CARD',
      token,
      customer_email: customerEmail,
      acceptance_token: acceptanceToken,
    };

    if (personalAuthToken) {
      body.accept_personal_auth = personalAuthToken;
    }

    const response = await this.request<{ data: WompiPaymentSource }>(
      'POST',
      '/payment_sources',
      body,
      'private',
    );

    this.logger.log(
      `Payment source created: ${response.data.id} (status: ${response.data.status})`,
    );

    return response.data;
  }

  /**
   * Creates a new transaction in Wompi.
   *
   * Supports both one-time and recurring payments. For recurring payments,
   * a paymentSourceId must be provided along with recurrent: true.
   *
   * @param params - Transaction parameters
   * @returns Created transaction with ID and initial status
   */
  async createTransaction(
    params: CreateTransactionParams,
  ): Promise<WompiTransaction> {
    this.logger.log(
      `Creating transaction: ref=${params.reference}, amount=${params.amountInCents} ${params.currency}`,
    );

    const body: Record<string, unknown> = {
      amount_in_cents: params.amountInCents,
      currency: params.currency,
      customer_email: params.customerEmail,
      reference: params.reference,
      acceptance_token: params.acceptanceToken,
    };

    if (params.paymentSourceId !== undefined) {
      body.payment_source_id = params.paymentSourceId;
    }
    if (params.recurrent !== undefined) {
      body.recurrent = params.recurrent;
    }
    if (params.redirectUrl) {
      body.redirect_url = params.redirectUrl;
    }
    if (params.personalAuthToken) {
      body.accept_personal_auth = params.personalAuthToken;
    }

    const response = await this.request<{ data: WompiTransaction }>(
      'POST',
      '/transactions',
      body,
      'private',
    );

    this.logger.log(
      `Transaction created: ${response.data.id} (status: ${response.data.status})`,
    );

    return response.data;
  }

  /**
   * Queries the current status of a transaction by its Wompi ID.
   *
   * Use this to poll transaction status after creation or to verify
   * the final state of a transaction after receiving a webhook.
   *
   * @param transactionId - The Wompi transaction ID
   * @returns Transaction details with current status
   */
  async getTransaction(transactionId: string): Promise<WompiTransaction> {
    this.logger.log(`Fetching transaction: ${transactionId}`);

    const response = await this.request<{ data: WompiTransaction }>(
      'GET',
      `/transactions/${transactionId}`,
      undefined,
      'private',
    );

    return response.data;
  }

  /**
   * Voids (deactivates) a payment source so it can no longer be used
   * for new transactions.
   *
   * @param paymentSourceId - The ID of the payment source to void
   */
  async voidPaymentSource(paymentSourceId: number): Promise<void> {
    this.logger.log(`Voiding payment source: ${paymentSourceId}`);

    await this.request(
      'PUT',
      `/payment_sources/${paymentSourceId}/void`,
      undefined,
      'private',
    );

    this.logger.log(`Payment source voided: ${paymentSourceId}`);
  }

  /**
   * Generates a SHA256 integrity hash for the Wompi checkout widget.
   *
   * The widget uses this hash to verify that the transaction parameters
   * have not been tampered with on the client side.
   *
   * The hash input is: reference + amountInCents + currency + [expirationTime +] integritySecret
   *
   * @param reference - Unique transaction reference
   * @param amountInCents - Amount in cents (integer)
   * @param currency - Currency code (e.g. "COP")
   * @param expirationTime - Optional expiration time string for the payment link
   * @returns SHA256 hex digest of the concatenated values
   */
  generateIntegrityHash(
    reference: string,
    amountInCents: number,
    currency: string,
    expirationTime?: string,
  ): string {
    let payload = `${reference}${amountInCents}${currency}`;
    if (expirationTime) {
      payload += expirationTime;
    }
    payload += this.integritySecret;

    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Verifies the authenticity of a Wompi webhook event.
   *
   * Wompi signs webhook events by:
   * 1. Extracting the values of properties listed in signature.properties from body.data
   * 2. Concatenating those values in order
   * 3. Appending the event timestamp
   * 4. Appending the event secret key
   * 5. Computing SHA256 of the result
   *
   * @param body - The raw webhook request body (parsed JSON)
   * @returns true if the signature is valid, false otherwise
   */
  verifyWebhookSignature(body: WompiWebhookBody): boolean {
    try {
      const { signature, data, timestamp } = body;

      if (!signature?.properties || !signature?.checksum || !data) {
        this.logger.warn('Webhook body missing required signature fields');
        return false;
      }

      // Concatenate the values of each property path from data
      const values = signature.properties.map((prop) =>
        this.resolvePropertyPath(data, prop),
      );

      const concatenated =
        values.join('') + String(timestamp) + this.eventSecret;
      const computedHash = createHash('sha256')
        .update(concatenated)
        .digest('hex');

      const isValid =
        computedHash.length === signature.checksum.length &&
        timingSafeEqual(
          Buffer.from(computedHash),
          Buffer.from(signature.checksum),
        );

      if (!isValid) {
        this.logger.warn(
          'Webhook signature verification failed: checksum mismatch',
        );
      }

      return isValid;
    } catch (error) {
      this.logger.error(
        `Error verifying webhook signature: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Sends an HTTP request to the Wompi API.
   *
   * @param method - HTTP method (GET, POST, PUT)
   * @param path - API path relative to base URL (e.g. "/transactions")
   * @param body - Optional request body for POST/PUT
   * @param auth - Which key to use: "public" or "private"
   * @returns Parsed JSON response body
   */
  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    auth: 'public' | 'private' = 'private',
  ): Promise<T> {
    const token = auth === 'public' ? this.publicKey : this.privateKey;
    const url = `${this.baseUrl}${path}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `Wompi API error: ${method} ${path} -> ${response.status} ${response.statusText}: ${errorBody}`,
        );
        throw new Error(
          `Wompi API error: ${response.status} ${response.statusText}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(`Wompi request timeout: ${method} ${path}`);
        throw new Error(`Wompi request timeout: ${method} ${path}`);
      }

      this.logger.error(
        `Wompi request failed: ${method} ${path} -> ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Resolves a dot-separated property path against a nested object.
   *
   * For example, resolvePropertyPath({ transaction: { id: "abc" } }, "transaction.id")
   * returns "abc".
   *
   * @param obj - The object to traverse
   * @param path - Dot-separated property path (e.g. "transaction.status")
   * @returns The string value at the path
   */
  private resolvePropertyPath(
    obj: Record<string, unknown>,
    path: string,
  ): string {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return '';
      }
      current = (current as Record<string, unknown>)[part];
    }

    return String(current ?? '');
  }
}

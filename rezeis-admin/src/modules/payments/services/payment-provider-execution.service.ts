import { Buffer } from 'node:buffer';
import { Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Currency, PaymentGateway, PaymentGatewayType, Transaction } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

import { paymentsConfig } from '../../../common/config/payments.config';
import { readGatewaySettings } from '../utils/payment-gateway-settings.util';

interface ProviderCheckoutResult {
  readonly gatewayId: string | null;
  readonly checkoutUrl: string | null;
  readonly providerMode: string;
  readonly providerStatus: string | null;
  readonly gatewayData: Record<string, unknown>;
}

@Injectable()
export class PaymentProviderExecutionService {
  public constructor(
    private readonly httpService: HttpService,
    @Inject(paymentsConfig.KEY)
    private readonly configuration: ConfigType<typeof paymentsConfig>,
  ) {}

  public async createCheckout(input: {
    readonly gateway: PaymentGateway;
    readonly transaction: Transaction;
    readonly description: string;
  }): Promise<ProviderCheckoutResult> {
    switch (input.gateway.type) {
      case PaymentGatewayType.YOOKASSA:
        return this.createYookassaCheckout(input);
      case PaymentGatewayType.PLATEGA:
        return this.createPlategaCheckout(input);
      case PaymentGatewayType.HELEKET:
        return this.createHeleketCheckout(input);
      case PaymentGatewayType.CRYPTOMUS:
        return this.createCryptomusCheckout(input);
      case PaymentGatewayType.MULENPAY:
        return this.createMulenpayCheckout(input);
      case PaymentGatewayType.TELEGRAM_STARS:
        return this.createTelegramStarsCheckout(input);
      default:
        throw new NotFoundException('Payment gateway not supported');
    }
  }

  private async createYookassaCheckout(input: {
    readonly gateway: PaymentGateway;
    readonly transaction: Transaction;
    readonly description: string;
  }): Promise<ProviderCheckoutResult> {
    const settings = readGatewaySettings(input.gateway.settings);
    const shopId = requireSetting(settings, 'shopId');
    const apiKey = requireSetting(settings, 'apiKey');
    const resultUrl = this.buildResultUrl(input.transaction.paymentId);
    const payload = {
      amount: {
        value: input.transaction.amount.toString(),
        currency: input.transaction.currency,
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: resultUrl,
      },
      description: input.description.slice(0, 128),
      metadata: {
        paymentId: input.transaction.paymentId,
        transactionId: input.transaction.id,
      },
    };
    const response = await firstValueFrom(
      this.httpService.post('https://api.yookassa.ru/v3/payments', payload, {
        auth: {
          username: shopId,
          password: apiKey,
        },
        headers: {
          'Idempotence-Key': input.transaction.paymentId,
        },
      }),
    );
    const data = response.data as Record<string, unknown>;
    const confirmation = readRecord(data.confirmation);
    return {
      gatewayId: readOptionalString(data, ['id']),
      checkoutUrl: readOptionalString(confirmation, ['confirmation_url']),
      providerMode: 'REDIRECT',
      providerStatus: readOptionalString(data, ['status']),
      gatewayData: {
        provider: 'YOOKASSA',
        providerStatus: readOptionalString(data, ['status']),
        providerResponse: data,
        checkoutUrl: readOptionalString(confirmation, ['confirmation_url']),
      },
    };
  }

  private async createPlategaCheckout(input: {
    readonly gateway: PaymentGateway;
    readonly transaction: Transaction;
    readonly description: string;
  }): Promise<ProviderCheckoutResult> {
    const settings = readGatewaySettings(input.gateway.settings);
    const merchantId = requireSetting(settings, 'merchantId');
    const secret = requireSetting(settings, 'secret');
    const paymentMethod = typeof settings.paymentMethod === 'number' ? settings.paymentMethod : 2;
    const resultUrl = this.buildResultUrl(input.transaction.paymentId);
    const payload = {
      paymentMethod,
      paymentDetails: {
        amount: Number(input.transaction.amount.toString()),
        currency: input.transaction.currency,
      },
      description: input.description.slice(0, 64),
      payload: input.transaction.paymentId,
      return: resultUrl,
      failedUrl: resultUrl,
    };
    const response = await firstValueFrom(
      this.httpService.post('https://app.platega.io/transaction/process', payload, {
        headers: {
          'X-MerchantId': merchantId,
          'X-Secret': secret,
        },
      }),
    );
    const data = response.data as Record<string, unknown>;
    const checkoutUrl =
      readOptionalString(data, ['redirect', 'paymentUrl', 'url']);
    return {
      gatewayId: readOptionalString(data, ['transactionId', 'id']),
      checkoutUrl,
      providerMode: 'REDIRECT',
      providerStatus: readOptionalString(data, ['status']),
      gatewayData: {
        provider: 'PLATEGA',
        providerStatus: readOptionalString(data, ['status']),
        providerResponse: data,
        checkoutUrl,
      },
    };
  }

  private async createHeleketCheckout(input: {
    readonly gateway: PaymentGateway;
    readonly transaction: Transaction;
    readonly description: string;
  }): Promise<ProviderCheckoutResult> {
    const settings = readGatewaySettings(input.gateway.settings);
    const merchantId = requireSetting(settings, 'merchantId');
    const apiKey = requireSetting(settings, 'apiKey');
    const resultUrl = this.buildResultUrl(input.transaction.paymentId);
    const payload = {
      amount: input.transaction.amount.toString(),
      currency: input.transaction.currency === Currency.XTR ? Currency.USD : input.transaction.currency,
      order_id: input.transaction.paymentId,
      description: input.description.slice(0, 255),
      url_success: resultUrl,
      url_return: resultUrl,
    };
    const serializedPayload = Buffer.from(JSON.stringify(payload), 'utf8');
    const sign = md5(`${serializedPayload.toString('base64')}${apiKey}`);
    const response = await firstValueFrom(
      this.httpService.post('https://api.heleket.com/v1/payment', payload, {
        headers: {
          merchant: merchantId,
          sign,
          'Content-Type': 'application/json',
        },
      }),
    );
    const data = response.data as Record<string, unknown>;
    const result = readRecord(data.result);
    const checkoutUrl = readOptionalString(result, ['url', 'payment_url', 'paymentUrl', 'invoice_url']);
    return {
      gatewayId: readOptionalString(result, ['uuid', 'id']),
      checkoutUrl,
      providerMode: 'REDIRECT',
      providerStatus: readOptionalString(result, ['status']),
      gatewayData: {
        provider: 'HELEKET',
        providerStatus: readOptionalString(result, ['status']),
        providerResponse: data,
        checkoutUrl,
      },
    };
  }

  private async createCryptomusCheckout(input: {
    readonly gateway: PaymentGateway;
    readonly transaction: Transaction;
    readonly description: string;
  }): Promise<ProviderCheckoutResult> {
    const settings = readGatewaySettings(input.gateway.settings);
    const merchantId = requireSetting(settings, 'merchantId');
    const apiKey = requireSetting(settings, 'apiKey');
    const resultUrl = this.buildResultUrl(input.transaction.paymentId);
    const webhookUrl = this.buildWebhookUrl(input.gateway.type);
    const payload = {
      amount: input.transaction.amount.toString(),
      currency: input.transaction.currency === Currency.XTR ? Currency.USD : input.transaction.currency,
      order_id: input.transaction.paymentId,
      description: input.description.slice(0, 255),
      url_return: resultUrl,
      url_success: resultUrl,
      is_payment_multiple: false,
      lifetime: 3600,
      url_callback: webhookUrl,
    };
    const serializedPayload = Buffer.from(JSON.stringify(payload), 'utf8');
    const sign = md5(`${serializedPayload.toString('base64')}${apiKey}`);
    const response = await firstValueFrom(
      this.httpService.post('https://api.cryptomus.com/v1/payment', payload, {
        headers: {
          merchant: merchantId,
          sign,
          'Content-Type': 'application/json',
        },
      }),
    );
    const data = response.data as Record<string, unknown>;
    const result = readRecord(data.result);
    const checkoutUrl =
      readOptionalString(result, ['url', 'payment_url', 'address_qr_code']);
    return {
      gatewayId: readOptionalString(result, ['uuid', 'payment_uuid']),
      checkoutUrl,
      providerMode: 'REDIRECT',
      providerStatus: readOptionalString(result, ['status']),
      gatewayData: {
        provider: 'CRYPTOMUS',
        providerStatus: readOptionalString(result, ['status']),
        providerResponse: data,
        checkoutUrl,
      },
    };
  }

  private async createMulenpayCheckout(input: {
    readonly gateway: PaymentGateway;
    readonly transaction: Transaction;
    readonly description: string;
  }): Promise<ProviderCheckoutResult> {
    const settings = readGatewaySettings(input.gateway.settings);
    const apiKey = requireSetting(settings, 'apiKey');
    const resultUrl = this.buildResultUrl(input.transaction.paymentId);
    const webhookUrl = this.buildWebhookUrl(input.gateway.type);
    const payload = {
      amount: input.transaction.amount.toString(),
      currency: input.transaction.currency,
      description: input.description.slice(0, 255),
      successUrl: resultUrl,
      failUrl: resultUrl,
      callbackUrl: webhookUrl,
      orderId: input.transaction.paymentId,
    };
    const response = await firstValueFrom(
      this.httpService.post('https://mulenpay.ru/v2/payments', payload, {
        headers: {
          'api-key': apiKey,
          'X-API-Key': apiKey,
        },
      }),
    );
    const data = response.data as Record<string, unknown>;
    const checkoutUrl = readOptionalString(data, ['paymentUrl', 'url']);
    return {
      gatewayId: readOptionalString(data, ['uuid', 'id']),
      checkoutUrl,
      providerMode: 'REDIRECT',
      providerStatus: readOptionalString(data, ['status']),
      gatewayData: {
        provider: 'MULENPAY',
        providerStatus: readOptionalString(data, ['status']),
        providerResponse: data,
        checkoutUrl,
      },
    };
  }

  private async createTelegramStarsCheckout(input: {
    readonly gateway: PaymentGateway;
    readonly transaction: Transaction;
    readonly description: string;
  }): Promise<ProviderCheckoutResult> {
    const botToken = this.configuration.botToken;
    if (botToken === null) {
      throw new ServiceUnavailableException('Telegram bot token is not configured');
    }
    if (input.transaction.currency !== Currency.XTR) {
      throw new ServiceUnavailableException('Telegram Stars payments require XTR pricing');
    }
    const payload = {
      title: truncate(input.description, 32),
      description: truncate(input.description, 255),
      payload: input.transaction.paymentId,
      currency: 'XTR',
      prices: [
        {
          label: 'Telegram Stars',
          amount: Number(input.transaction.amount.toString()),
        },
      ],
    };
    const response = await firstValueFrom(
      this.httpService.post(
        `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
        payload,
      ),
    );
    const data = response.data as Record<string, unknown>;
    if (data.ok !== true || typeof data.result !== 'string') {
      throw new ServiceUnavailableException('Telegram Stars invoice creation failed');
    }
    return {
      gatewayId: input.transaction.paymentId,
      checkoutUrl: data.result,
      providerMode: 'TELEGRAM_INVOICE',
      providerStatus: 'invoice_created',
      gatewayData: {
        provider: 'TELEGRAM_STARS',
        providerStatus: 'invoice_created',
        providerResponse: data,
        checkoutUrl: data.result,
      },
    };
  }

  private buildResultUrl(paymentId: string): string {
    const webUrl = this.configuration.ruidPublicWebUrl;
    if (webUrl === null) {
      throw new ServiceUnavailableException('RUID public web URL is not configured');
    }
    const normalizedBaseUrl = webUrl.replace(/\/$/, '');
    return `${normalizedBaseUrl}/payments/result?paymentId=${encodeURIComponent(paymentId)}`;
  }

  private buildWebhookUrl(gatewayType: PaymentGatewayType): string {
    const adminBaseUrl = this.configuration.adminPublicBaseUrl;
    if (adminBaseUrl === null) {
      throw new ServiceUnavailableException('Admin public base URL is not configured');
    }
    const normalizedBaseUrl = adminBaseUrl.replace(/\/$/, '');
    return `${normalizedBaseUrl}/api/v1/payments/webhooks/${gatewayType}`;
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readOptionalString(
  value: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }
  return null;
}

function requireSetting(
  settings: Record<string, unknown>,
  key: string,
): string {
  const value = readOptionalString(settings, [key]);
  if (value === null) {
    throw new ServiceUnavailableException(`Payment gateway setting ${key} is missing`);
  }
  return value;
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}

function md5(value: string): string {
  return require('node:crypto').createHash('md5').update(value).digest('hex');
}

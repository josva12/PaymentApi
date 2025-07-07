import axios from "axios";
import { logger } from "../utils/logger";
import { storage } from "../storage";

interface WebhookPayload {
  event: string;
  transactionId: string;
  status: string;
  amount?: number;
  currency?: string;
  provider: string;
  receiptNumber?: string;
  timestamp: string;
  metadata?: any;
}

interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
}

class WebhookService {
  // Process webhook from payment providers
  async processWebhook(webhookResult: any): Promise<void> {
    try {
      const { transactionId, status, receiptNumber, amount, phone, accountNumber } = webhookResult;

      // Update transaction status
      const updateData: any = {
        status: status === "completed" ? "completed" : "failed",
        completedAt: new Date(),
      };

      if (receiptNumber) {
        updateData.mpesaReceiptNumber = receiptNumber;
      }

      if (amount) {
        updateData.amount = amount.toString();
      }

      await storage.updateTransaction(transactionId, updateData);

      // Get transaction details
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        logger.error(`Transaction not found for webhook: ${transactionId}`);
        return;
      }

      // Get user webhooks
      const webhooks = await storage.getWebhooksByUser(transaction.userId);
      const activeWebhooks = webhooks.filter(webhook => webhook.isActive);

      // Prepare webhook payload
      const payload: WebhookPayload = {
        event: `payment.${status}`,
        transactionId,
        status,
        amount: parseFloat(transaction.amount),
        currency: transaction.currency,
        provider: transaction.provider,
        receiptNumber,
        timestamp: new Date().toISOString(),
        metadata: {
          phone,
          accountNumber,
          paymentMethod: transaction.paymentMethod,
        },
      };

      // Send webhooks to all active endpoints
      const deliveryPromises = activeWebhooks.map(webhook => 
        this.deliverWebhook(webhook, payload)
      );

      await Promise.allSettled(deliveryPromises);

      logger.info(`Webhook processed for transaction ${transactionId}`);
    } catch (error) {
      logger.error("Error processing webhook:", error);
      throw error;
    }
  }

  // Deliver webhook to endpoint
  async deliverWebhook(webhook: any, payload: WebhookPayload): Promise<WebhookDeliveryResult> {
    try {
      // Generate HMAC signature
      const signature = this.generateSignature(payload, webhook.secret);

      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'User-Agent': 'KenyanPaymentAPI/1.0',
        },
        timeout: webhook.timeout || 30000,
      });

      // Log successful delivery
      await storage.createWebhookDelivery({
        webhookId: webhook.id,
        transactionId: payload.transactionId,
        event: payload.event,
        payload,
        responseStatus: response.status,
        responseBody: JSON.stringify(response.data),
        attempt: 1,
        success: true,
      });

      return {
        success: true,
        statusCode: response.status,
        responseBody: JSON.stringify(response.data),
      };
    } catch (error) {
      logger.error(`Webhook delivery failed for ${webhook.url}:`, error);

      // Log failed delivery
      await storage.createWebhookDelivery({
        webhookId: webhook.id,
        transactionId: payload.transactionId,
        event: payload.event,
        payload,
        responseStatus: (error as any).response?.status,
        responseBody: (error as any).response?.data,
        attempt: 1,
        success: false,
        errorMessage: (error as any).message,
      });

      // Schedule retry if within retry limit
      if (webhook.retryCount > 0) {
        this.scheduleRetry(webhook, payload, 1);
      }

      return {
        success: false,
        statusCode: (error as any).response?.status,
        error: (error as any).message,
      };
    }
  }

  // Schedule webhook retry with exponential backoff
  private scheduleRetry(webhook: any, payload: WebhookPayload, attempt: number): void {
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30 seconds

    setTimeout(async () => {
      try {
        const signature = this.generateSignature(payload, webhook.secret);

        const response = await axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': payload.event,
            'User-Agent': 'KenyanPaymentAPI/1.0',
          },
          timeout: webhook.timeout || 30000,
        });

        // Log successful retry
        await storage.createWebhookDelivery({
          webhookId: webhook.id,
          transactionId: payload.transactionId,
          event: payload.event,
          payload,
          responseStatus: response.status,
          responseBody: JSON.stringify(response.data),
          attempt: attempt + 1,
          success: true,
        });

        logger.info(`Webhook retry successful for ${webhook.url} (attempt ${attempt + 1})`);
      } catch (error) {
        logger.error(`Webhook retry failed for ${webhook.url} (attempt ${attempt + 1}):`, error);

        // Log failed retry
        await storage.createWebhookDelivery({
          webhookId: webhook.id,
          transactionId: payload.transactionId,
          event: payload.event,
          payload,
          responseStatus: (error as any).response?.status,
          responseBody: (error as any).response?.data,
          attempt: attempt + 1,
          success: false,
          errorMessage: (error as any).message,
        });

        // Schedule another retry if within limit
        if (attempt < webhook.retryCount) {
          this.scheduleRetry(webhook, payload, attempt + 1);
        } else {
          logger.warn(`Webhook delivery failed after ${webhook.retryCount} attempts for ${webhook.url}`);
        }
      }
    }, delay);
  }

  // Generate HMAC signature for webhook security
  private generateSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    const data = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Get webhook delivery statistics
  async getDeliveryStats(webhookId: number): Promise<any> {
    try {
      const deliveries = await storage.getWebhookDeliveries(webhookId);
      
      const total = deliveries.length;
      const successful = deliveries.filter(d => d.success).length;
      const failed = total - successful;
      const successRate = total > 0 ? (successful / total) * 100 : 0;

      return {
        total,
        successful,
        failed,
        successRate: Math.round(successRate * 100) / 100,
        averageResponseTime: this.calculateAverageResponseTime(deliveries),
      };
    } catch (error) {
      logger.error("Error getting webhook delivery stats:", error);
      throw error;
    }
  }

  // Calculate average response time
  private calculateAverageResponseTime(deliveries: any[]): number {
    const successfulDeliveries = deliveries.filter(d => d.success && d.responseStatus === 200);
    if (successfulDeliveries.length === 0) return 0;

    // This would need to be implemented based on actual response time tracking
    return 0;
  }
}

export const webhookService = new WebhookService(); 
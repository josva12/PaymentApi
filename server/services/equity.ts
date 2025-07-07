import axios from "axios";
import { logger } from "../utils/logger";
import { Transaction } from "@shared/schema";

// Equity Bank API Configuration
const EQUITY_CONFIG = {
  baseUrl: process.env.EQUITY_BASE_URL || "https://api.equitybankgroup.com",
  apiKey: process.env.EQUITY_API_KEY || "",
  merchantId: process.env.EQUITY_MERCHANT_ID || "",
  environment: process.env.NODE_ENV || "sandbox",
};

interface EquityPaymentResult {
  checkoutRequestId: string;
  merchantRequestId: string;
  instructions: string;
}

interface EquityWebhookResult {
  transactionId: string;
  status: string;
  receiptNumber?: string;
  amount?: number;
  accountNumber?: string;
  timestamp: string;
}

class EquityService {
  // Initiate Equity Bank payment
  async initiatePayment(transaction: Transaction): Promise<EquityPaymentResult> {
    try {
      const payload = {
        merchantId: EQUITY_CONFIG.merchantId,
        amount: parseFloat(transaction.amount),
        currency: transaction.currency,
        reference: transaction.reference || transaction.transactionId,
        description: transaction.description || "Payment",
        accountNumber: transaction.accountNumber,
        callbackUrl: `${process.env.API_BASE_URL}/api/v1/webhooks/equity`,
        customerPhone: transaction.phone,
        customerEmail: transaction.metadata?.customerEmail,
      };

      const response = await axios.post(
        `${EQUITY_CONFIG.baseUrl}/v1/payments/initiate`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${EQUITY_CONFIG.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        logger.info(`Equity payment initiated for transaction ${transaction.transactionId}`);
        return {
          checkoutRequestId: response.data.transactionId,
          merchantRequestId: response.data.merchantRequestId,
          instructions: "Please complete the payment through your Equity Bank account",
        };
      } else {
        throw new Error(`Equity payment failed: ${response.data.message}`);
      }
    } catch (error) {
      logger.error(`Equity payment failed for transaction ${transaction.transactionId}:`, error);
      throw new Error("Failed to initiate Equity Bank payment");
    }
  }

  // Handle Equity Bank webhook
  async handleWebhook(webhookData: any): Promise<EquityWebhookResult> {
    try {
      // Verify webhook signature
      this.verifyWebhookSignature(webhookData);

      const status = webhookData.status;
      const transactionId = webhookData.transactionId;
      const receiptNumber = webhookData.receiptNumber;
      const amount = webhookData.amount;
      const accountNumber = webhookData.accountNumber;

      if (status === "SUCCESS") {
        logger.info(`Equity payment successful: ${receiptNumber}`);

        return {
          transactionId,
          status: "completed",
          receiptNumber,
          amount,
          accountNumber,
          timestamp: new Date().toISOString(),
        };
      } else {
        logger.warn(`Equity payment failed: ${webhookData.message}`);

        return {
          transactionId,
          status: "failed",
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error("Error processing Equity webhook:", error);
      throw new Error("Failed to process Equity webhook");
    }
  }

  // Verify webhook signature
  private verifyWebhookSignature(webhookData: any): boolean {
    // Implementation depends on Equity Bank API security requirements
    // This is a placeholder for signature verification
    return true;
  }

  // Check transaction status
  async checkTransactionStatus(transactionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${EQUITY_CONFIG.baseUrl}/v1/payments/status/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${EQUITY_CONFIG.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to check Equity transaction status for ${transactionId}:`, error);
      throw new Error("Failed to check transaction status");
    }
  }

  // Get account balance
  async getAccountBalance(accountNumber: string): Promise<any> {
    try {
      const response = await axios.get(
        `${EQUITY_CONFIG.baseUrl}/v1/accounts/${accountNumber}/balance`,
        {
          headers: {
            'Authorization': `Bearer ${EQUITY_CONFIG.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get account balance for ${accountNumber}:`, error);
      throw new Error("Failed to get account balance");
    }
  }
}

export const equityService = new EquityService(); 
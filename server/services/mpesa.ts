import axios from "axios";
import crypto from "crypto";
import { logger } from "../utils/logger";
import { Transaction } from "@shared/schema";

// DARAJA API Configuration
const DARAJA_CONFIG = {
  baseUrl: process.env.DARAJA_BASE_URL || "https://sandbox.safaricom.co.ke",
  consumerKey: process.env.DARAJA_CONSUMER_KEY || "",
  consumerSecret: process.env.DARAJA_CONSUMER_SECRET || "",
  passkey: process.env.DARAJA_PASSKEY || "",
  shortcode: process.env.DARAJA_SHORTCODE || "",
  environment: process.env.NODE_ENV || "sandbox",
};

interface STKPushResult {
  checkoutRequestId: string;
  merchantRequestId: string;
  instructions?: string;
}

interface PaybillResult {
  checkoutRequestId: string;
  merchantRequestId: string;
  instructions: string;
}

interface WebhookResult {
  transactionId: string;
  status: string;
  receiptNumber?: string;
  amount?: number;
  phone?: string;
  timestamp: string;
}

class MpesaService {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  // Get access token from DARAJA API
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${DARAJA_CONFIG.consumerKey}:${DARAJA_CONFIG.consumerSecret}`).toString('base64');
      
      const response = await axios.get(`${DARAJA_CONFIG.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
      
      logger.info("M-Pesa access token refreshed");
      return this.accessToken;
    } catch (error) {
      logger.error("Failed to get M-Pesa access token:", error);
      throw new Error("Failed to authenticate with M-Pesa API");
    }
  }

  // Generate password for STK push
  private generatePassword(): string {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, -3);
    const password = DARAJA_CONFIG.shortcode + DARAJA_CONFIG.passkey + timestamp;
    return Buffer.from(password).toString('base64');
  }

  // Initiate STK push for mobile payments
  async initiateSTKPush(transaction: Transaction): Promise<STKPushResult> {
    try {
      const accessToken = await this.getAccessToken();
      const password = this.generatePassword();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, -3);

      const payload = {
        BusinessShortCode: DARAJA_CONFIG.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(parseFloat(transaction.amount)),
        PartyA: transaction.phone,
        PartyB: DARAJA_CONFIG.shortcode,
        PhoneNumber: transaction.phone,
        CallBackURL: `${process.env.API_BASE_URL}/api/v1/webhooks/mpesa`,
        AccountReference: transaction.reference || transaction.transactionId,
        TransactionDesc: transaction.description || "Payment",
      };

      const response = await axios.post(
        `${DARAJA_CONFIG.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.ResultCode === "0") {
        logger.info(`STK push initiated for transaction ${transaction.transactionId}`);
        return {
          checkoutRequestId: response.data.CheckoutRequestID,
          merchantRequestId: response.data.MerchantRequestID,
          instructions: "Please check your phone and enter M-Pesa PIN to complete payment",
        };
      } else {
        throw new Error(`STK push failed: ${response.data.ResultDesc}`);
      }
    } catch (error) {
      logger.error(`STK push failed for transaction ${transaction.transactionId}:`, error);
      throw new Error("Failed to initiate STK push");
    }
  }

  // Initiate paybill payment
  async initiatePaybillPayment(transaction: Transaction): Promise<PaybillResult> {
    try {
      const paybillNumber = transaction.paybillNumber || DARAJA_CONFIG.shortcode;
      const accountReference = transaction.accountReference || transaction.transactionId;

      logger.info(`Paybill payment initiated for transaction ${transaction.transactionId}`);
      
      return {
        checkoutRequestId: `PB_${transaction.transactionId}`,
        merchantRequestId: `MR_${transaction.transactionId}`,
        instructions: `Pay KES ${transaction.amount} to Paybill ${paybillNumber}, Account: ${accountReference}`,
      };
    } catch (error) {
      logger.error(`Paybill payment failed for transaction ${transaction.transactionId}:`, error);
      throw new Error("Failed to initiate paybill payment");
    }
  }

  // Handle M-Pesa webhook
  async handleWebhook(webhookData: any): Promise<WebhookResult> {
    try {
      // Verify webhook signature (implement based on DARAJA documentation)
      // this.verifyWebhookSignature(webhookData);

      const resultCode = webhookData.Body?.stkCallback?.ResultCode;
      const checkoutRequestId = webhookData.Body?.stkCallback?.CheckoutRequestID;
      const resultDesc = webhookData.Body?.stkCallback?.ResultDesc;

      if (resultCode === "0") {
        // Payment successful
        const item = webhookData.Body?.stkCallback?.CallbackMetadata?.Item;
        const receiptNumber = item?.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value;
        const amount = item?.find((i: any) => i.Name === "Amount")?.Value;
        const phone = item?.find((i: any) => i.Name === "PhoneNumber")?.Value;

        logger.info(`M-Pesa payment successful: ${receiptNumber}`);

        return {
          transactionId: checkoutRequestId,
          status: "completed",
          receiptNumber,
          amount: amount / 100, // Convert from cents
          phone,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Payment failed
        logger.warn(`M-Pesa payment failed: ${resultDesc}`);

        return {
          transactionId: checkoutRequestId,
          status: "failed",
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error("Error processing M-Pesa webhook:", error);
      throw new Error("Failed to process M-Pesa webhook");
    }
  }

  // Verify webhook signature (implement based on DARAJA security requirements)
  private verifyWebhookSignature(webhookData: any): boolean {
    // Implementation depends on DARAJA API security requirements
    // This is a placeholder for signature verification
    return true;
  }

  // Check transaction status
  async checkTransactionStatus(checkoutRequestId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, -3);
      const password = this.generatePassword();

      const payload = {
        BusinessShortCode: DARAJA_CONFIG.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      const response = await axios.post(
        `${DARAJA_CONFIG.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to check transaction status for ${checkoutRequestId}:`, error);
      throw new Error("Failed to check transaction status");
    }
  }
}

export const mpesaService = new MpesaService(); 
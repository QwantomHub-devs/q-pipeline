import {
  PaystackBank,
  PaystackResolveBankResult,
  PaystackTransferRecipientResult,
  PaystackTransferResult,
  PayoutStatus,
} from './types';

const PAYSTACK_API_BASE = 'https://api.paystack.co';

/**
 * Paystack Payout / Transfer API Integration Client
 */
export class PaystackClient {
  private secretKey: string;

  constructor(secretKey?: string) {
    this.secretKey = secretKey || process.env.PAYSTACK_SECRET_KEY || '';
  }

  /**
   * Fetch list of supported banks from Paystack
   */
  async fetchSupportedBanks(): Promise<PaystackBank[]> {
    if (!this.secretKey) {
      // Return standard mock bank roster for testing & local development
      return [
        { name: 'Access Bank', code: '044', active: true },
        { name: 'Guaranty Trust Bank (GTBank)', code: '058', active: true },
        { name: 'First Bank of Nigeria', code: '011', active: true },
        { name: 'United Bank for Africa (UBA)', code: '033', active: true },
        { name: 'Zenith Bank', code: '057', active: true },
        { name: 'Kuda Bank', code: '50211', active: true },
      ];
    }

    const res = await fetch(`${PAYSTACK_API_BASE}/bank`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Paystack API error: Failed to fetch supported banks (${res.statusText})`);
    }

    const data = await res.json();
    return data.data.map((b: any) => ({
      name: b.name,
      code: b.code,
      active: b.active,
    }));
  }

  /**
   * Resolve bank account number with Paystack Bank Resolution API (`/bank/resolve`)
   */
  async resolveBankAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<PaystackResolveBankResult> {
    if (!this.secretKey) {
      // Mock account resolution for test environment
      if (accountNumber === '0000000000') {
        throw new Error('Could not resolve account name for provided account number and bank code');
      }
      if (accountNumber === '9999999999' || accountNumber.includes('MISMATCH')) {
        return {
          accountNumber,
          accountName: 'UNAUTHORIZED THIRD PARTY HOLDER',
          bankCode,
        };
      }
      return {
        accountNumber,
        accountName: 'ADA LOVELACE',
        bankCode,
      };
    }


    const url = `${PAYSTACK_API_BASE}/bank/resolve?account_number=${encodeURIComponent(
      accountNumber
    )}&bank_code=${encodeURIComponent(bankCode)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to resolve bank account details via Paystack');
    }

    const data = await res.json();
    return {
      accountNumber: data.data.account_number,
      accountName: data.data.account_name,
      bankCode,
    };
  }

  /**
   * Create a Paystack Transfer Recipient (`/transferrecipient`)
   */
  async createTransferRecipient(
    name: string,
    accountNumber: string,
    bankCode: string
  ): Promise<PaystackTransferRecipientResult> {
    if (!this.secretKey) {
      return {
        recipientCode: `RCP_${crypto.randomUUID().substring(0, 8)}`,
        name,
        accountNumber,
        bankCode,
      };
    }

    const res = await fetch(`${PAYSTACK_API_BASE}/transferrecipient`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create Paystack transfer recipient');
    }

    const data = await res.json();
    return {
      recipientCode: data.data.recipient_code,
      name: data.data.name,
      accountNumber: data.data.details.account_number,
      bankCode: data.data.details.bank_code,
    };
  }

  /**
   * Initiate local bank payout transfer via Paystack Transfers API (`/transfer`)
   */
  async initiateTransfer(
    amount: number,
    recipientCode: string,
    reference: string,
    reason: string
  ): Promise<PaystackTransferResult> {
    if (!this.secretKey) {
      // Mock transfer execution
      const isTestFailure = reference.includes('FAIL');
      const status: PayoutStatus = isTestFailure ? 'failed' : 'success';
      return {
        transferCode: `TRF_${crypto.randomUUID().substring(0, 8)}`,
        reference,
        status,
        amount,
      };
    }

    const res = await fetch(`${PAYSTACK_API_BASE}/transfer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(amount * 100), // Convert to kobo / subunit
        recipient: recipientCode,
        reference,
        reason,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to initiate Paystack transfer payout');
    }

    const data = await res.json();
    const rawStatus = data.data.status;
    let status: PayoutStatus = 'pending';
    if (rawStatus === 'success') status = 'success';
    else if (rawStatus === 'failed') status = 'failed';
    else if (rawStatus === 'reversed') status = 'reversed';
    else status = 'processing';

    return {
      transferCode: data.data.transfer_code,
      reference: data.data.reference,
      status,
      amount,
    };
  }

  /**
   * Verify status of a transfer via Paystack (`/transfer/verify/:reference`)
   */
  async verifyTransfer(reference: string): Promise<PaystackTransferResult> {
    if (!this.secretKey) {
      return {
        transferCode: `TRF_VERIFIED_${reference}`,
        reference,
        status: 'success',
        amount: 100,
      };
    }

    const res = await fetch(`${PAYSTACK_API_BASE}/transfer/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error('Failed to verify transfer status via Paystack');
    }

    const data = await res.json();
    return {
      transferCode: data.data.transfer_code,
      reference: data.data.reference,
      status: data.data.status === 'success' ? 'success' : 'failed',
      amount: data.data.amount / 100,
    };
  }
}

export const defaultPaystackClient = new PaystackClient();

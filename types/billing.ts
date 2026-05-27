/**
 * Billing Module Types
 * Based on the billing-frontend.md documentation
 */

// Balance response type
export interface BalanceData {
  balance: number;
  currency: string;
  rate_per_minute: number;
  low_balance_threshold: number;
  is_low_balance: boolean;
  this_month_calls: number;
  this_month_minutes: number;
  this_month_spend: number;
}

// Transaction types
export interface Transaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  created_at: string; // ISO datetime
}

export interface TransactionHistoryResponse {
  transactions: Transaction[];
  count: number;
}

// Usage record types
export interface UsageRecord {
  id: string;
  call_sid: string;
  campaign_id: string | null;
  campaign_name: string | null;
  created_by: string | null;
  session_id: string | null;
  duration_seconds: number;
  billable_minutes: number;
  rate_per_minute: number;
  amount_charged: number;
  created_at: string; // ISO datetime
}

export interface UsageResponse {
  usage: UsageRecord[];
  count: number;
}

// Invoice types
export interface Invoice {
  id: string;
  invoice_number: string;
  period_start: string; // ISO datetime
  period_end: string; // ISO datetime
  total_calls: number;
  total_minutes: number;
  total_amount: number;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'PAID';
  created_at: string; // ISO datetime
}

export interface InvoiceDetail extends Invoice {
  usage_breakdown: UsageRecord[];
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  count: number;
}

export interface InvoiceDetailResponse {
  invoice: InvoiceDetail;
}

// Settings types
export interface BillingSettings {
  low_balance_threshold: number;
  currency: string;
}

export interface UpdateSettingsRequest {
  low_balance_threshold?: number;
}

// Top-up types
export interface CreateOrderRequest {
  amount: number;
}

export interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export interface VerifyTopupRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyTopupResponse {
  amount_credited: number;
  balance_before: number;
  balance_after: number;
}

// Admin types
export interface Account {
  id: string;
  tenant_id: string;
  balance: number;
  rate_per_minute: number;
  currency: string;
  is_active: boolean;
  low_balance_threshold: number;
}

export interface AccountListResponse {
  accounts: Account[];
  count: number;
}

export interface CreditTenantRequest {
  amount: number;
}

export interface CreditTenantResponse {
  amount_credited: number;
  balance_before: number;
  balance_after: number;
}

export interface SetRateRequest {
  rate_per_minute: number;
}

export interface SetRateResponse {
  tenant_id: string;
  rate_per_minute: number;
}
# Transaction Storage Guide

## Overview

Transactions are automatically stored in the database when Paystack sends webhook events. The `transactions` table stores all payment information for payment history display.

## Database Schema

The `transactions` table has the following structure:

```sql
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    user_id BIGINT,
    paystack_reference VARCHAR(255) UNIQUE NOT NULL,
    paystack_customer_code VARCHAR(255),
    paystack_authorization_code VARCHAR(255),
    amount INTEGER NOT NULL, -- Amount in kobo/minor units
    currency VARCHAR(3) DEFAULT 'NGN',
    plan VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    gateway_response TEXT,
    metadata JSONB,
    transaction_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## How It Works

### 1. Payment Initialization

When a user initiates a payment:

- Frontend calls `/subscription/paystack/initialize`
- Backend creates a Paystack transaction with metadata:
  ```python
  metadata={
      "organization_id": org_id,
      "user_id": user_id,
      "plan": plan_enum.value,
  }
  ```

### 2. Webhook Processing

When Paystack processes the payment, it sends a webhook to:

```
POST /api/v1/subscription/paystack/webhook
```

The webhook handler:

1. Verifies the webhook signature
2. Extracts transaction data from the event
3. Stores the transaction in the `transactions` table
4. Updates/creates the subscription

### 3. Transaction Storage

Transactions are stored automatically in the `charge.success` event handler:

```python
transaction_data = {
    "organization_id": org_id,
    "user_id": user_id,
    "paystack_reference": reference,
    "paystack_customer_code": customer_code,
    "paystack_authorization_code": authorization_code,
    "amount": amount,
    "currency": currency,
    "plan": plan.value,
    "status": "success",
    "gateway_response": data.get("gateway_response", ""),
    "metadata": metadata,
    "transaction_date": data.get("paid_at") or now.isoformat(),
}
```

### 4. Payment History Retrieval

The frontend calls:

```
GET /api/v1/subscription/payment-history
```

This endpoint:

- Queries the `transactions` table for the organization
- Returns formatted payment history
- Includes all transaction details

## Setup Instructions

### 1. Run the Migration

Execute the SQL migration file in your Supabase SQL Editor:

```bash
# File: migrations/add_transactions_table.sql
```

Or run it directly in Supabase:

1. Go to SQL Editor
2. Copy the contents of `migrations/add_transactions_table.sql`
3. Execute it

### 2. Configure Webhook URL

In your Paystack Dashboard:

1. Go to Settings > Webhooks
2. Add webhook URL: `https://your-api-domain.com/api/v1/subscription/paystack/webhook`
3. Select events: `charge.success`, `subscription.disable`, `invoice.payment_failed`
4. Save

### 3. Test Webhook

You can test the webhook using Paystack's webhook testing tool or by making a test payment.

## Querying Transactions

### Get all transactions for an organization:

```sql
SELECT * FROM transactions
WHERE organization_id = 1
ORDER BY transaction_date DESC;
```

### Get successful transactions:

```sql
SELECT * FROM transactions
WHERE organization_id = 1
AND status = 'success'
ORDER BY transaction_date DESC;
```

### Get total revenue:

```sql
SELECT SUM(amount) as total_revenue
FROM transactions
WHERE organization_id = 1
AND status = 'success';
```

## Notes

- Transactions are stored with unique `paystack_reference` to prevent duplicates
- Failed transactions are not automatically stored (only successful ones via webhook)
- You can manually store failed transactions if needed by listening to `charge.failed` events
- The `metadata` JSONB field can store additional custom data

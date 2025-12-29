# Paystack Amount Conversion Guide

## Overview

Paystack requires all amounts to be specified in the **smallest currency unit** (kobo for Nigerian Naira).

## Conversion Formula

**1 Naira = 100 Kobo**

To convert from Naira to Kobo:

```
Amount in Kobo = Amount in Naira × 100
```

## Examples

| Naira Amount | Kobo Amount    | Description       |
| ------------ | -------------- | ----------------- |
| ₦14,500      | 1,450,000 kobo | Starter Plan      |
| ₦39,500      | 3,950,000 kobo | Professional Plan |
| ₦99,500      | 9,950,000 kobo | Enterprise Plan   |
| ₦1,000       | 100,000 kobo   | Example           |

## Implementation in Code

### Backend (Python)

```python
# Plan prices are stored in Naira
price_monthly = 14500  # ₦14,500

# Convert to kobo for Paystack
amount_in_kobo = price_monthly * 100  # 1,450,000 kobo

# Send to Paystack API
result = await paystack_service.initialize_transaction(
    email=email,
    amount=amount_in_kobo,  # Amount in kobo
    currency="NGN",
    ...
)
```

### Frontend (TypeScript/React)

```typescript
// Display amounts in Naira
const formatPrice = (price: number) => {
  return `₦${price.toLocaleString("en-NG")}`;
};

// Example: ₦14,500
formatPrice(14500);
```

## Important Notes

1. **Always multiply by 100**: When sending amounts to Paystack, multiply Naira amounts by 100
2. **Store in Naira**: In your database, store prices in Naira (not kobo) for readability
3. **Display in Naira**: Always display prices to users in Naira format
4. **Convert on API call**: Only convert to kobo when making Paystack API calls

## Paystack API Documentation

According to Paystack's API documentation:

- Amounts must be in the smallest currency unit
- For NGN (Nigerian Naira), the smallest unit is kobo
- Amounts are sent as integers (no decimals)

Reference: https://paystack.com/docs/api/transaction/#initialize

## Verification

When you receive webhook events from Paystack:

- The `amount` field will be in kobo
- To display to users, divide by 100: `amount / 100` = Naira amount

Example:

```python
# Webhook receives: amount = 1450000 (kobo)
naira_amount = 1450000 / 100  # = 14500 (₦14,500)
```

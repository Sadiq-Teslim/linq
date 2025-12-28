# Setup Instructions

## Quick Start Guide

### 1. Database Setup

Run the transactions table migration in Supabase:

```sql
-- File: backend-api/migrations/add_transactions_table.sql
-- Copy and paste this into Supabase SQL Editor and execute
```

### 2. Environment Variables

Create/update `.env` file in `backend-api/` directory:

```env
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Paystack
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=your-paystack-public-key

# Google OAuth (see GOOGLE_OAUTH_SETUP.md for detailed instructions)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

# URLs
API_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

# Security
SECRET_KEY=your-super-secret-key-min-32-chars-long
```

### 3. Install Dependencies

```bash
cd backend-api
pip install -r requirements.txt
```

### 4. Start Backend Server

```bash
cd backend-api
python main.py
```

Server will start on `http://localhost:8000`

### 5. Start Frontend

```bash
cd landing-page
npm install
npm run dev
```

Frontend will start on `http://localhost:5173`

## Testing Payment Flow

1. **Start both servers** (backend and frontend)
2. **Create an account** or login
3. **Navigate to Dashboard > Payment**
4. **Select a plan** and click "Subscribe Now"
5. **Complete payment** on Paystack (use test cards)
6. **Verify redirect** back to dashboard
7. **Check payment history** in Dashboard > Payment

### Paystack Test Cards

- **Success**: `4084084084084081`
- **Decline**: `4084084084084085`
- **Insufficient Funds**: `4084084084084082`

Use any CVV and future expiry date.

## Google OAuth Setup

See `backend-api/GOOGLE_OAUTH_SETUP.md` for detailed instructions.

**Quick steps:**
1. Create Google Cloud Project
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:8000/api/v1/auth/google/callback`
5. Copy Client ID and Secret to `.env`

## Transaction Storage

See `backend-api/TRANSACTION_STORAGE.md` for details.

**Key points:**
- Transactions are automatically stored via webhook
- Webhook URL: `https://your-api-domain.com/api/v1/subscription/paystack/webhook`
- Configure in Paystack Dashboard > Settings > Webhooks

## Troubleshooting

### Backend won't start
- Check that all environment variables are set
- Verify Supabase credentials are correct
- Check port 8000 is not in use

### Google OAuth not working
- Verify redirect URI matches exactly in Google Console
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Ensure OAuth consent screen is configured

### Payment not completing
- Check Paystack keys are correct
- Verify webhook URL is configured in Paystack
- Check backend logs for errors

### Transactions not showing
- Verify transactions table exists (run migration)
- Check webhook is receiving events
- Verify organization_id is in transaction metadata


# Backend API Endpoints Summary

## Available & Connected Endpoints

### AUTH ENDPOINTS

✅ **POST /auth/register**

- Request: `{ company_name, full_name, email, password, industry }`
- Response: `{ user: { id, email, full_name, company_name }, access_token, token_type, expires_in }`
- Status: FULLY AVAILABLE

✅ **POST /auth/login**

- Request: FormData `{ username (email), password }`
- Response: `{ access_token, token_type, expires_in, user }`
- Status: FULLY AVAILABLE

✅ **POST /auth/logout**

- Request: Authorization header
- Response: `{ message: "Successfully logged out" }`
- Status: FULLY AVAILABLE

✅ **GET /auth/me**

- Request: Authorization header
- Response: `{ id, email, full_name, company_name, created_at }`
- Status: FULLY AVAILABLE

✅ **GET /auth/session/status**

- Request: Authorization header
- Response: `{ status, user_id, email }`
- Status: FULLY AVAILABLE

### SUBSCRIPTION ENDPOINTS

✅ **GET /subscription/plans**

- Request: No auth required
- Response: `[{ id, name, price_monthly, price_yearly, currency, max_tracked_companies, max_team_members, max_contacts_per_company, features, is_popular }]`
- Status: FULLY AVAILABLE

✅ **GET /subscription/plans/{plan_id}**

- Request: No auth required
- Response: Single plan details object
- Status: FULLY AVAILABLE

✅ **GET /subscription/current**

- Request: Authorization header
- Response: `{ id, plan, status, price_monthly, currency, max_tracked_companies, current_period_start, current_period_end, trial_ends_at, cancelled_at, created_at, updated_at }`
- Status: FULLY AVAILABLE

✅ **POST /subscription/subscribe**

- Request: `{ plan: "free_trial" | "starter" | "professional" | "enterprise" }`
- Response: Subscription object
- Status: FULLY AVAILABLE

✅ **POST /subscription/upgrade**

- Request: `{ plan: "starter" | "professional" | "enterprise" }`
- Response: Subscription object
- Status: FULLY AVAILABLE

✅ **POST /subscription/access-codes**

- Request: `{ expires_in_days?: number }` (optional, defaults to 30)
- Response: `{ id, code, organization_id, organization_name, plan, is_used, used_at, expires_at, is_active, created_at }`
- Status: FULLY AVAILABLE

✅ **GET /subscription/access-codes**

- Request: Authorization header
- Response: `[{ id, code, organization_name, plan, is_used, expires_at, is_active, created_at }]`
- Status: FULLY AVAILABLE

✅ **POST /subscription/paystack/initialize**

- Request: `{ plan: string, callback_url: string }`
- Response: `{ authorization_url, access_code, reference }`
- Status: FULLY AVAILABLE

✅ **GET /subscription/paystack/verify/{reference}**

- Request: Authorization header
- Response: `{ verified: boolean, access_code?, message?, status? }`
- Status: FULLY AVAILABLE

---

## PARTIALLY AVAILABLE / NOT FULLY CONNECTED Endpoints

### SUBSCRIPTION ENDPOINTS (Not yet in landing page)

⚠️ **POST /subscription/access-codes/validate**

- Request: `{ code: string }`
- Response: `{ valid: boolean, organization_name?, plan?, expires_at?, message? }`
- Status: Backend available, not connected to landing page (used by extension)

⚠️ **POST /subscription/access-codes/activate**

- Request: `{ code: string }`
- Response: `{ success: boolean, access_token?, token_type, expires_in?, user?, organization?, message? }`
- Status: Backend available, not connected (used by extension for activation)

⚠️ **DELETE /subscription/access-codes/{code_id}**

- Status: Backend available, not connected (admin feature)

⚠️ **POST /subscription/paystack/webhook**

- Status: Backend internal webhook, not needed for landing page

⚠️ **POST /subscription/paystack/create-customer**

- Status: Backend available, not connected

---

## OTHER ENDPOINTS (Not included in landing page scope)

### COMPANY TRACKING

- `GET /companies/search`
- `GET /companies/search/{domain}/details`
- `GET /companies`
- `POST /companies`
- `GET /companies/{company_id}`
- `PATCH /companies/{company_id}`
- `DELETE /companies/{company_id}`
- `POST /companies/{company_id}/contacts`
- `GET /companies/{company_id}/contacts`
- `PATCH /companies/{company_id}/contacts/{contact_id}`
- `DELETE /companies/{company_id}/contacts/{contact_id}`
- `GET /companies/updates`
- `POST /companies/updates/mark-read`
- `POST /companies/{company_id}/refresh`

### FEED/NEWS

- `GET /feed`
- `GET /feed/refresh`
- `GET /feed/stats`
- `GET /feed/event-types`
- `GET /feed/industry`
- `POST /feed/industry/bookmark`
- `GET /feed/industry/bookmarks`
- `GET /feed/industry/news-types`
- `GET /feed/industry/industries`

### EXPORT

- `GET /export/csv`
- `POST /export/csv/bulk`

### SEARCH

- `POST /search/company`
- `GET /search/company/{company_name}`

---

## Summary

**Status:**

- ✅ **11 endpoints connected** to the landing page (Auth + Core Subscription)
- ⚠️ **5 endpoints partially available** (mostly extension-focused)
- ℹ️ **15+ other endpoints** available but not in landing page scope

**Next Steps for Full Integration:**

1. Implement payment history display on Payment page (already receiving paystack verify data)
2. Add team member management on Settings page (requires org endpoints - not yet available)
3. Add company tracking features on separate dashboard (requires company tracking endpoints)
4. Implement payment callback handler for successful Paystack payment

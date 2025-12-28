# Google OAuth Setup Instructions

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. Access to Google Cloud Console

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "LINQ OAuth")
5. Click "Create"

### 2. Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API" or "People API"
3. Click on it and click "Enable"

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" (unless you have a Google Workspace)
   - Fill in the required information:
     - App name: LINQ
     - User support email: your-email@example.com
     - Developer contact: your-email@example.com
   - Click "Save and Continue"
   - Add scopes: `openid`, `email`, `profile`
   - Add test users (your email) if in testing mode
   - Click "Save and Continue"
4. Back to creating OAuth client:
   - Application type: "Web application"
   - Name: "LINQ Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:8000` (for development)
     - `https://your-production-domain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:8000/api/v1/auth/google/callback` (for development)
     - `https://your-api-domain.com/api/v1/auth/google/callback` (for production)
   - Click "Create"
5. Copy the **Client ID** and **Client Secret**

### 4. Configure Environment Variables

Add these to your `.env` file in the `backend-api` directory:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
```

For production, update `GOOGLE_REDIRECT_URI` to your production API URL.

### 5. Update Frontend URL

Make sure `FRONTEND_URL` in your `.env` matches where your frontend is hosted:

```env
FRONTEND_URL=http://localhost:5173
```

For production:
```env
FRONTEND_URL=https://your-frontend-domain.com
```

## Testing

1. Start your backend server
2. Navigate to your frontend login page
3. Click "Continue with Google"
4. You should be redirected to Google's login page
5. After logging in, you'll be redirected back to your app

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure the redirect URI in Google Console exactly matches `GOOGLE_REDIRECT_URI` in your `.env`
- Check for trailing slashes and protocol (http vs https)

### Error: "invalid_client"
- Verify your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Make sure there are no extra spaces in your `.env` file

### Error: "access_denied"
- Check that you've added test users in the OAuth consent screen (if in testing mode)
- Make sure the OAuth consent screen is published (for production)

## Production Checklist

- [ ] OAuth consent screen is published (not in testing mode)
- [ ] Production redirect URIs are added to Google Console
- [ ] Environment variables are set correctly in production
- [ ] HTTPS is enabled (required for production OAuth)
- [ ] Frontend callback URL is configured correctly


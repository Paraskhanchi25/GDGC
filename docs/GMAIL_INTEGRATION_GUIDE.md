# PULSE — Google Cloud & Gmail API Setup Guide

## 1. Create or Select a Google Cloud Project
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Select your PULSE project (or create one).

## 2. Enable the Gmail API
1. Go to **APIs & Services → Library**.
2. Search for **Gmail API** and click **Enable**.

## 3. Configure the OAuth Consent Screen
1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** (for public Google users) and fill in:
   - App name: `PULSE`
   - User support email & Developer contact email
3. Add the requested scope:
   - `https://www.googleapis.com/auth/gmail.readonly` — Required so PULSE can read only relevant subscription, renewal, trial, and billing receipt emails. PULSE never requests send, modify, or delete permissions.
   - `openid` and `email` — Used to display which Gmail address is connected.
4. During development / before Google verification, add your **Test users** under **Audience / Test users**.

## 4. Create OAuth 2.0 Client Credentials
1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Add **Authorized redirect URIs**:
   - Local development: `http://localhost:3000/api/v1/gmail/callback`
   - Production (Coolify): `https://gdgc.swappy.lol/api/v1/gmail/callback`
4. Copy the generated **Client ID** and **Client Secret**.

## 5. Configure Environment Variables
Add these to `.env` (local) and Coolify environment variables (production):
```env
GOOGLE_CLIENT_ID=<your-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-oauth-client-secret>
GOOGLE_REDIRECT_URI=https://gdgc.swappy.lol/api/v1/gmail/callback
GOOGLE_OAUTH_ENCRYPTION_KEY=<32-byte-url-safe-fernet-key>
```
Generate a Fernet encryption key with Python:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## 6. Production OAuth Verification
Because `https://www.googleapis.com/auth/gmail.readonly` is a **restricted scope**, Google requires **OAuth App Verification** (including privacy policy, homepage verification, and security assessment if applicable) before removing the 100-user testing cap. Until verified, only accounts listed under **Test users** in Google Cloud Console can complete consent.

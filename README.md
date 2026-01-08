# Fitbit Meal Logger - Cloudflare Workers

A strict backend API for logging meals to Fitbit via Custom GPT Actions. Built for Cloudflare Workers with D1 database.

> **Live Demo**: https://fitbit-meal-logger.dogu757.workers.dev

## 🚀 Features

- ✅ **Strict validation** - No inference, no guessing, no defaults
- ✅ **OAuth 2.0** - Secure Fitbit integration with auto token refresh
- ✅ **Idempotency** - Prevent duplicate meal logs
- ✅ **OpenAPI spec** - Ready for Custom GPT Actions
- ✅ **Auto-deploy** - CI/CD via GitHub Actions
- ✅ **Free hosting** - Cloudflare Workers (100k requests/day)
- ✅ **Global edge** - <50ms latency worldwide

## 📋 Quick Start

### 1. Prerequisites

- Cloudflare account (free tier)
- Fitbit Developer account
- GitHub account
- Node.js 20

### 2. Clone & Install

```bash
git clone https://github.com/dogukanozdemir/fitibit-auto-meal.git
cd fitibit-auto-meal
npm install
```

### 3. Setup Cloudflare

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create fitbit-meal-logger-db

# Copy the database_id from output and update wrangler.toml
# Then initialize the schema:
wrangler d1 execute fitbit-meal-logger-db --file=./schema.sql
```

### 4. Configure Secrets

```bash
wrangler secret put FITBIT_CLIENT_ID
wrangler secret put FITBIT_CLIENT_SECRET
wrangler secret put API_KEY
```

### 5. Deploy

```bash
npm run deploy
```

Your API is now live! 🎉

### 6. Complete OAuth

Visit `https://fitbit-meal-logger.YOUR-SUBDOMAIN.workers.dev/auth/start` and authorize with Fitbit.




## 📡 API Endpoints

### Public (No Auth)
- `GET /health` - Health check
- `GET /auth/start` - Start OAuth flow
- `GET /auth/callback` - OAuth callback
- `GET /openapi.json` - OpenAPI spec for GPT

### Protected (X-API-Key Required)
- `GET /foods` - List registered foods
- `POST /foods` - Create custom food in Fitbit
- `POST /foods/register` - Register existing Fitbit food
- `POST /meals/log` - Log a meal (with idempotency)
- `GET /units` - Get Fitbit units

## 🧪 API Usage Examples

### Get Foods

```bash
curl https://fitbit-meal-logger.dogu757.workers.dev/foods \
  -H "X-API-Key: YOUR_API_KEY"
```

### Create a Custom Food

```bash
curl -X POST https://fitbit-meal-logger.dogu757.workers.dev/foods \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "canonicalName": "protein shake",
    "displayName": "Protein Shake",
    "defaultUnitId": 147,
    "defaultAmount": 1,
    "calories": 280,
    "protein_g": 30,
    "carbs_g": 12,
    "fat_g": 8
  }'
```

### Log a Meal

```bash
curl -X POST https://fitbit-meal-logger.dogu757.workers.dev/meals/log \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-08",
    "mealTypeId": 7,
    "items": [
      {
        "canonicalName": "protein shake",
        "amount": 1,
        "unitId": 147
      }
    ]
  }'
```

## 🤖 Custom GPT Setup

1. **Get OpenAPI spec**: Visit `/openapi.json`
2. **Create Custom GPT**: Go to ChatGPT → Custom GPTs → Create
3. **Add Action**: Paste the OpenAPI JSON
4. **Add Authentication**:
   - Type: API Key
   - Header: `X-API-Key`
   - Value: Your API key
5. **Instructions**: See `CUSTOM_GPT_INSTRUCTIONS.md`

## 🔄 Auto-Deploy Setup

Every push to `main` automatically deploys to Cloudflare Workers.

### Required GitHub Secrets

Add these in your repo settings → Secrets → Actions:

1. `CLOUDFLARE_API_TOKEN` - Get from https://dash.cloudflare.com/profile/api-tokens
2. `CLOUDFLARE_ACCOUNT_ID` - Get from Cloudflare dashboard
3. `FITBIT_CLIENT_ID` - From https://dev.fitbit.com/apps
4. `FITBIT_CLIENT_SECRET` - From Fitbit dev portal
5. `API_KEY` - Your secure API key

See **CI_CD_SETUP.md** for detailed instructions.

## 📊 Common Fitbit Values

### Meal Type IDs
- `1` - Breakfast
- `3` - Lunch
- `5` - Dinner
- `7` - Anytime/Snack

### Common Unit IDs
- `147` - serving
- `226` - grams (g)
- `180` - ounces (oz)
- `389` - cup
- `279` - milliliters (ml)

Get full list: `GET /units`

## 🏗️ Architecture

```
Custom GPT
    ↓ (X-API-Key)
Cloudflare Workers (Hono)
    ↓
Cloudflare D1 (SQLite)
    ↓
Fitbit API (OAuth 2.0)
```

**Tech Stack:**
- Runtime: Cloudflare Workers (V8 Isolates)
- Framework: Hono
- Database: Cloudflare D1 (SQLite)
- Validation: Zod
- CI/CD: GitHub Actions

## 🗂️ Project Structure

```
├── src/
│   ├── index.ts              # Main Hono app
│   └── workers/
│       ├── db.ts             # D1 database layer
│       ├── fitbitClient.ts   # Fitbit API client
│       └── routes/           # API routes
├── .github/workflows/
│   └── deploy.yml            # Auto-deploy workflow
├── wrangler.toml             # Cloudflare config
├── schema.sql                # D1 database schema
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🔒 Security

- API key authentication on all protected endpoints
- Fitbit tokens stored in D1 (never exposed)
- Secrets managed via Wrangler
- Auto token refresh before expiry
- CORS disabled by default

## 💰 Costs

**Cloudflare Workers Free Tier:**
- 100,000 requests/day
- 10ms CPU time/request
- D1: 5 GB storage, 25M row reads/month

Perfect for personal use - you'll likely never exceed the free tier! 🎉

## 🐛 Troubleshooting

### "No tokens found"
Complete OAuth flow at `/auth/start`

### "UNAUTHORIZED" errors
Check X-API-Key header matches your secret

### Fitbit errors (502)
- Verify Fitbit app credentials
- Check callback URL: `https://YOUR-DOMAIN/auth/callback`
- Ensure scopes include `nutrition` and `profile`

### Database errors
Ensure schema is initialized: `wrangler d1 execute fitbit-meal-logger-db --file=./schema.sql`

## 📚 Additional Documentation

- **CI_CD_SETUP.md** - GitHub Actions setup guide
- **CUSTOM_GPT_INSTRUCTIONS.md** - Custom GPT configuration
- **schema.sql** - Database schema

## 🔗 Links

- **Live API**: https://fitbit-meal-logger.dogu757.workers.dev
- **GitHub**: https://github.com/dogukanozdemir/fitibit-auto-meal
- **Fitbit Developers**: https://dev.fitbit.com/
- **Cloudflare Docs**: https://developers.cloudflare.com/workers

## 📄 License

MIT

---

**Built with Cloudflare Workers, Hono, and D1**  
**Designed for Custom GPT Actions**

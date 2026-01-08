# Deploying to Cloudflare Workers

Complete guide to deploy the Fitbit Meal Logger to Cloudflare Workers (free tier).

## Prerequisites

- Cloudflare account (free tier is fine)
- Node.js 20
- Git

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

## Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open your browser for authentication.

## Step 3: Set Up Workers Project

### 3.1 Replace package.json

```bash
cd fitbit-meal-logger
mv package.json package-node.json
mv package-workers.json package.json
```

### 3.2 Replace tsconfig.json

```bash
mv tsconfig.json tsconfig-node.json
mv tsconfig-workers.json tsconfig.json
```

### 3.3 Install Workers Dependencies

```bash
npm install
```

## Step 4: Create D1 Database

```bash
# Create the database
wrangler d1 create fitbit-meal-logger-db
```

You'll get output like:
```
✅ Successfully created DB 'fitbit-meal-logger-db'

[[d1_databases]]
binding = "DB"
database_name = "fitbit-meal-logger-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Copy the `database_id`** and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "fitbit-meal-logger-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ← Paste here
```

## Step 5: Initialize Database Schema

### Local (for testing)

```bash
wrangler d1 execute fitbit-meal-logger-db --local --file=./schema.sql
```

### Production

```bash
wrangler d1 execute fitbit-meal-logger-db --file=./schema.sql
```

## Step 6: Set Environment Secrets

```bash
# Set your Fitbit credentials
wrangler secret put FITBIT_CLIENT_ID
# Paste your client ID and press Enter

wrangler secret put FITBIT_CLIENT_SECRET
# Paste your client secret and press Enter

wrangler secret put API_KEY
# Paste your API key and press Enter
```

## Step 7: Update wrangler.toml

Edit `wrangler.toml` and set your BASE_URL:

```toml
[env.production]
vars = { BASE_URL = "https://fitbit-meal-logger.YOUR-SUBDOMAIN.workers.dev" }
```

Replace `YOUR-SUBDOMAIN` with your Cloudflare Workers subdomain (find it in your Cloudflare dashboard).

## Step 8: Test Locally

```bash
npm run dev
```

Visit http://localhost:8787/health - you should see `{"status":"ok"}`

## Step 9: Deploy to Production

```bash
npm run deploy
```

You'll see:
```
✨  Built successfully!
✨  Successfully published your script to
   https://fitbit-meal-logger.YOUR-SUBDOMAIN.workers.dev
```

## Step 10: Update Fitbit App Callback URL

1. Go to https://dev.fitbit.com/apps
2. Edit your Fitbit app
3. Update **Callback URL** to:
   ```
   https://fitbit-meal-logger.YOUR-SUBDOMAIN.workers.dev/auth/callback
   ```
4. Save

## Step 11: Complete OAuth Flow

Visit:
```
https://fitbit-meal-logger.YOUR-SUBDOMAIN.workers.dev/auth/start
```

Authorize with Fitbit. You should see:
```json
{"success":true,"message":"Tokens saved successfully"}
```

## Step 12: Test the API

```bash
export API_KEY=your_api_key_here
export BASE_URL=https://fitbit-meal-logger.YOUR-SUBDOMAIN.workers.dev

# Health check
curl $BASE_URL/health

# Get foods
curl $BASE_URL/foods -H "X-API-Key: $API_KEY"

# Create a food
curl -X POST $BASE_URL/foods \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "canonicalName": "test food",
    "displayName": "Test Food",
    "defaultUnitId": 147,
    "defaultAmount": 1,
    "calories": 100,
    "protein_g": 10,
    "carbs_g": 10,
    "fat_g": 3
  }'
```

## Costs

**Cloudflare Workers Free Tier:**
- ✅ 100,000 requests per day
- ✅ 10ms CPU time per request
- ✅ D1 database: 5 GB storage, 25 million row reads/month

**Perfect for personal use!**

## Monitoring

View logs and analytics:

```bash
# Tail logs in real-time
wrangler tail

# View in dashboard
# Go to: https://dash.cloudflare.com → Workers & Pages → fitbit-meal-logger
```

## Updating

After making code changes:

```bash
# Test locally
npm run dev

# Deploy to production
npm run deploy
```

## Troubleshooting

### "Database not found"
- Make sure you ran `wrangler d1 execute` to initialize the schema
- Check that `database_id` in `wrangler.toml` matches your D1 database

### "UNAUTHORIZED" on /auth/callback
- Check that secrets are set: `wrangler secret list`
- Verify `BASE_URL` matches your Workers URL

### "No tokens found"
- Complete the OAuth flow at `/auth/start`
- Check D1 database: `wrangler d1 execute fitbit-meal-logger-db --command "SELECT * FROM tokens"`

### Fitbit errors (502)
- Verify your Fitbit app credentials
- Check that callback URL matches exactly
- Ensure scopes include `nutrition` and `profile`

## Custom Domain (Optional)

To use your own domain:

1. Go to Cloudflare Dashboard → Workers & Pages → fitbit-meal-logger
2. Click "Custom Domains" → "Add Custom Domain"
3. Enter your domain (e.g., `api.yourdomain.com`)
4. Update `BASE_URL` in `wrangler.toml`
5. Update Fitbit callback URL
6. Redeploy: `npm run deploy`

## Reverting to Node.js Version

If you want to switch back to the Node.js version:

```bash
mv package.json package-workers.json
mv package-node.json package.json
mv tsconfig.json tsconfig-workers.json
mv tsconfig-node.json tsconfig.json
npm install
```

## Architecture Differences

| Feature | Node.js Version | Workers Version |
|---------|----------------|-----------------|
| Framework | Fastify | Hono |
| Database | SQLite (better-sqlite3) | Cloudflare D1 |
| Runtime | Node.js 20 | V8 Isolate |
| Deployment | VPS/Docker | Cloudflare Edge |
| Cold Start | ~1s | ~10ms |
| Scaling | Manual | Automatic |

## Next Steps

1. **Configure Custom GPT** - Use `$BASE_URL/openapi.json` for the schema
2. **Monitor Usage** - Check Cloudflare dashboard for request metrics
3. **Set Up Alerts** - Configure Cloudflare alerts for errors/limits
4. **Optimize** - Workers have a 10ms CPU limit; profile if needed

---

**Congratulations!** Your Fitbit Meal Logger is now running on Cloudflare's global edge network! 🎉

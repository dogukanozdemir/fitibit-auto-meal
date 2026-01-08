# Cloudflare Workers Version

This directory contains a **Cloudflare Workers** adaptation of the Fitbit Meal Logger.

## Key Differences from Node.js Version

| Aspect | Node.js | Cloudflare Workers |
|--------|---------|-------------------|
| **Framework** | Fastify | Hono |
| **Database** | SQLite (better-sqlite3) | Cloudflare D1 |
| **Runtime** | Node.js 20 | V8 Isolate |
| **Deployment** | VPS/Docker/Render | Cloudflare Edge |
| **Configuration** | `.env` file | Wrangler secrets |
| **Setup Time** | 5 minutes | 10 minutes |
| **Cost** | Varies | Free (100k req/day) |

## Quick Start

See **[DEPLOY_WORKERS.md](DEPLOY_WORKERS.md)** for complete deployment instructions.

### TL;DR

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Switch to Workers version
mv package.json package-node.json
mv package-workers.json package.json
mv tsconfig.json tsconfig-node.json
mv tsconfig-workers.json tsconfig.json

# Install dependencies
npm install

# Create D1 database
wrangler d1 create fitbit-meal-logger-db

# Update wrangler.toml with database_id

# Initialize schema
wrangler d1 execute fitbit-meal-logger-db --file=./schema.sql

# Set secrets
wrangler secret put FITBIT_CLIENT_ID
wrangler secret put FITBIT_CLIENT_SECRET
wrangler secret put API_KEY

# Deploy
npm run deploy
```

## Why Cloudflare Workers?

### ✅ Pros
- **Free tier**: 100,000 requests/day
- **Global edge**: <50ms latency worldwide
- **Auto-scaling**: No configuration needed
- **No maintenance**: Fully managed
- **Fast cold starts**: ~10ms vs ~1s for Node.js

### ❌ Cons
- **More complex setup**: D1 database creation, secrets management
- **10ms CPU limit**: Per request (usually not an issue)
- **Less mature ecosystem**: Fewer libraries than Node.js
- **Debugging**: Slightly harder than local Node.js

## File Structure (Workers Version)

```
src/
├── index.ts                  # Main Hono app (replaces server.ts)
└── workers/
    ├── db.ts                 # D1 database layer
    ├── fitbitClient.ts       # Fitbit API (adapted for Workers)
    └── routes/
        ├── auth.ts           # OAuth routes
        ├── foods.ts          # Food management
        ├── meals.ts          # Meal logging
        └── units.ts          # Units proxy

wrangler.toml                 # Workers configuration
schema.sql                    # D1 database schema
package-workers.json          # Workers dependencies
tsconfig-workers.json         # Workers TypeScript config
```

## API Compatibility

The Workers version maintains **100% API compatibility** with the Node.js version:
- Same endpoints
- Same request/response formats
- Same validation rules
- Same error codes

You can use the **same Custom GPT configuration** for both versions!

## Performance

| Metric | Node.js (VPS) | Cloudflare Workers |
|--------|--------------|-------------------|
| Cold start | ~1000ms | ~10ms |
| Request latency | 50-200ms | 10-50ms (global) |
| Concurrent requests | Limited by VPS | Unlimited |
| Availability | 99.9% (depends) | 99.99%+ |

## Monitoring

```bash
# Real-time logs
wrangler tail

# View metrics
# Go to: https://dash.cloudflare.com → Workers & Pages
```

## Costs

**Free Tier (perfect for personal use):**
- 100,000 requests/day
- 10ms CPU time/request
- D1: 5 GB storage, 25M row reads/month

**Paid (if you exceed free tier):**
- $0.50 per additional 1M requests
- D1: $0.001 per 1M rows read

Most users will **never hit the free tier limits** for personal meal logging.

## Migration Path

### From Node.js to Workers

1. Follow [DEPLOY_WORKERS.md](DEPLOY_WORKERS.md)
2. Export data from SQLite: `sqlite3 app.db .dump > backup.sql`
3. Import to D1: Convert to D1 format and execute
4. Update Fitbit callback URL
5. Deploy and test

### From Workers to Node.js

```bash
# Revert file swaps
mv package.json package-workers.json
mv package-node.json package.json
mv tsconfig.json tsconfig-workers.json
mv tsconfig-node.json tsconfig.json

# Reinstall Node dependencies
npm install

# Export D1 data and import to SQLite
# Then continue with standard Node.js deployment
```

## Support & Troubleshooting

See [DEPLOY_WORKERS.md](DEPLOY_WORKERS.md) for detailed troubleshooting.

Common issues:
- Database not found → Run schema.sql
- Auth errors → Check secrets are set
- Fitbit errors → Verify callback URL

## Which Version Should I Use?

### Choose **Node.js** if:
- You want the simplest setup (5 minutes)
- You have a VPS or server already
- You prefer traditional Node.js development
- You want to use Docker

### Choose **Cloudflare Workers** if:
- You want **free**, globally distributed hosting
- You need **fast cold starts**
- You prefer **managed infrastructure**
- You're okay with a slightly more complex setup

Both versions are production-ready and fully functional!

---

**Need help?** Check [DEPLOY_WORKERS.md](DEPLOY_WORKERS.md) or open an issue on GitHub.

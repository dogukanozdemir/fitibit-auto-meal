# Project Summary: Fitbit Meal Logger Backend

## Overview

A production-ready, strict backend API for logging meals to Fitbit via Custom GPT Actions. Built with Node.js, TypeScript, and Fastify.

## Key Principles

### 1. Strict Validation (No Inference)
- Backend performs ZERO inference, guessing, or defaulting
- All required fields must be provided by the client (ChatGPT)
- Missing or invalid data results in clear 400 errors
- Only trivial normalization: canonicalName trimming and lowercasing

### 2. "Dumb" Backend, Smart Client
- ChatGPT handles ALL logic:
  - Portion size calculations
  - Unit conversions
  - Calorie/macro calculations
  - Food name resolution
  - Date formatting
  - Meal type selection
- Backend only validates and forwards to Fitbit

### 3. Security First
- API key authentication on all protected endpoints
- Fitbit tokens stored encrypted in SQLite, never exposed
- No secrets in code or logs
- Environment-based configuration

## Architecture

```
┌─────────────┐
│  Custom GPT │
│   Actions   │
└──────┬──────┘
       │ HTTP + X-API-Key
       ▼
┌─────────────────────┐
│  Fastify Server     │
│  - API Key Auth     │
│  - Zod Validation   │
│  - OpenAPI/Swagger  │
└──────┬──────────────┘
       │
       ├──► SQLite DB (app.db)
       │    - Foods registry (canonical → fitbitFoodId)
       │    - OAuth tokens
       │    - Idempotency keys
       │    - Audit logs
       │
       ▼
┌─────────────────────┐
│   Fitbit API        │
│  - OAuth 2.0        │
│  - Create Foods     │
│  - Log Meals        │
└─────────────────────┘
```

## Technology Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Runtime | Node.js 20 | Stable LTS with good module support |
| Language | TypeScript | Type safety and IDE support |
| Framework | Fastify | Fast, low overhead, great plugin system |
| Database | SQLite (better-sqlite3) | Single-file, zero-config, synchronous API |
| Validation | Zod | Runtime type checking with TypeScript inference |
| HTTP Client | undici (fetch) | Native Node.js fetch implementation |
| Documentation | @fastify/swagger | Auto-generated OpenAPI spec |

## File Structure

```
fitbit-meal-logger/
├── src/
│   ├── server.ts           # Main Fastify app, routes, auth hooks
│   ├── config.ts           # Environment config validation
│   ├── db.ts               # SQLite database layer
│   ├── fitbitClient.ts     # Fitbit API client (OAuth + requests)
│   └── routes/
│       ├── auth.ts         # OAuth flow (/auth/start, /auth/callback)
│       ├── foods.ts        # Food management (create, register, list)
│       ├── meals.ts        # Meal logging (with idempotency)
│       └── units.ts        # Fitbit units proxy
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript config
├── .nvmrc                  # Node version specification
├── .env                    # Environment variables (gitignored)
├── app.db                  # SQLite database (gitignored)
├── README.md               # Main documentation
├── SETUP.md                # Step-by-step setup guide
├── FITBIT_REFERENCE.md     # Fitbit API constants and tips
├── examples.http           # REST Client examples
└── test-api.sh             # Automated API test script
```

## API Endpoints

### Public (No Auth)
- `GET /health` - Health check
- `GET /auth/start` - Start OAuth flow
- `GET /auth/callback` - OAuth callback
- `GET /documentation` - Swagger UI
- `GET /openapi.json` - OpenAPI spec

### Protected (Require X-API-Key)
- `GET /foods` - List all registered foods
- `POST /foods` - Create custom food in Fitbit + register locally
- `POST /foods/register` - Register existing Fitbit food (no API call)
- `POST /meals/log` - Log a meal (with idempotency support)
- `GET /units` - Get Fitbit units list

## Database Schema

### `tokens` table
Stores Fitbit OAuth tokens (single row, id=1).
- `access_token` - Current access token
- `refresh_token` - Refresh token
- `expires_at` - Unix timestamp when access token expires

### `foods` table
Maps canonical food names to Fitbit food IDs.
- `canonical_name` - Normalized name (unique index)
- `display_name` - Human-readable name
- `fitbit_food_id` - Fitbit's food ID
- `default_unit_id` - Default unit for this food
- `default_amount` - Default serving size
- `calories` - Calories per serving
- `protein_g`, `carbs_g`, `fat_g` - Macros (optional)

### `idempotency_keys` table
Prevents duplicate meal logging.
- `key` - Client-provided idempotency key
- `request_hash` - SHA-256 hash of request body
- `response_json` - Stored response for replay

### `logs` table
Audit trail of all meal logs.
- `date` - Meal date
- `meal_type_id` - Fitbit meal type
- `request_json` - Original request
- `fitbit_response_json` - Fitbit's response

## Key Features

### 1. Automatic Token Refresh
Before every Fitbit API call, the backend checks if the access token is expired. If so, it automatically refreshes using the refresh token and updates the database.

### 2. Idempotency Support
Clients can provide an `Idempotency-Key` header when logging meals. If the same key is used again:
- With the same request: returns 409 with the original response
- With a different request: returns 409 with an error

### 3. Canonical Name Normalization
Food names are normalized to lowercase with single spaces:
- `"  PROTEIN  SHAKE  "` → `"protein shake"`

This ensures consistent lookups regardless of input formatting.

### 4. Fitbit Error Passthrough
When Fitbit returns an error, the backend returns a 502 with:
```json
{
  "error": "FITBIT_UPSTREAM_ERROR",
  "status": 400,
  "body": "..."
}
```

This gives the client full context on what went wrong.

### 5. OpenAPI Integration
The backend auto-generates an OpenAPI spec that can be directly imported into Custom GPT Actions. No manual schema writing needed.

## Validation Strategy

All request bodies use Zod schemas with strict validation:

```typescript
const createFoodSchema = z.object({
  canonicalName: z.string().min(1),
  displayName: z.string().min(1),
  defaultUnitId: z.number().int(),
  defaultAmount: z.number().positive(),
  calories: z.number(),
  protein_g: z.number().optional(),
  carbs_g: z.number().optional(),
  fat_g: z.number().optional(),
});
```

Invalid requests return:
```json
{
  "error": "VALIDATION_ERROR",
  "details": [ ... Zod error array ... ]
}
```

## Error Handling

| Code | Error | Cause |
|------|-------|-------|
| 400 | VALIDATION_ERROR | Invalid request body/params |
| 401 | UNAUTHORIZED | Missing/invalid API key |
| 409 | CONFLICT | Resource exists or idempotency violation |
| 502 | FITBIT_UPSTREAM_ERROR | Fitbit API error |
| 500 | Internal Server Error | Unexpected error (logged) |

## Security Considerations

### What's Protected
- All API endpoints except `/health`, `/auth/*`, `/documentation`, `/openapi.json`
- API key required via `X-API-Key` header
- Fitbit tokens never returned in responses
- Secrets in environment variables only

### What's Not Protected (By Design)
- OpenAPI spec is public (needed for GPT setup)
- Health endpoint is public (for monitoring)
- OAuth endpoints are public (needed for browser flow)

### Production Recommendations
1. Use HTTPS (`BASE_URL=https://yourdomain.com`)
2. Rotate API key regularly
3. Use strong random API key (32+ characters)
4. Set up rate limiting (not included in this base implementation)
5. Monitor logs for suspicious activity
6. Restrict network access to known IPs if possible

## Custom GPT Integration

### Step 1: Get OpenAPI Spec
```bash
curl http://localhost:3000/openapi.json > openapi.json
```

### Step 2: Import to Custom GPT
1. Go to ChatGPT → Custom GPTs → Create
2. In Actions → Add Action
3. Paste the OpenAPI JSON
4. Add authentication:
   - Type: API Key
   - Header: `X-API-Key`
   - Value: Your API key

### Step 3: Train the GPT
Example instructions:
```
You are a meal logging assistant. When users tell you what they ate:

1. Extract food items, portions, and timing
2. Check the foods registry (GET /foods)
3. For unknown foods:
   - Ask user for nutritional info OR look it up
   - Create the food (POST /foods) with exact values
4. Convert portions to (amount, unitId) pairs
5. Log the meal (POST /meals/log) with:
   - date: ISO format (YYYY-MM-DD)
   - mealTypeId: 1=breakfast, 3=lunch, 5=dinner, 7=anytime
   - items: array with canonicalName, amount, unitId

Never guess portions, calories, or unit IDs. Always ask if unsure.
```

## Development Workflow

### Local Development
```bash
npm run dev  # Starts tsx with hot reload
```

### Production Build
```bash
npm run build  # Compiles TypeScript to dist/
npm start      # Runs compiled JavaScript
```

### Testing
```bash
# Automated test script
API_KEY=your_key ./test-api.sh

# Or use examples.http with REST Client extension
```

## Deployment

### Option 1: VPS (Recommended)
1. Set up Node.js 20 on server
2. Clone repo
3. Create `.env` with production values
4. Update Fitbit app callback URL to production URL
5. Run `npm ci --production`
6. Run `npm run build`
7. Use PM2 or systemd to keep running:
   ```bash
   pm2 start dist/server.js --name fitbit-logger
   ```

### Option 2: Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["node", "dist/server.js"]
```

### Option 3: Serverless
Not ideal - SQLite doesn't work well in serverless environments. Consider switching to PostgreSQL if going serverless.

## Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Check Logs
Fastify logs to stdout. Redirect to file or use a log aggregator:
```bash
npm start 2>&1 | tee app.log
```

### Database Queries
```bash
# Check recent logs
sqlite3 app.db "SELECT * FROM logs ORDER BY created_at DESC LIMIT 5;"

# Check token expiry
sqlite3 app.db "SELECT datetime(expires_at, 'unixepoch') FROM tokens;"

# Count registered foods
sqlite3 app.db "SELECT COUNT(*) FROM foods;"
```

## Future Enhancements

Possible additions (not implemented):
- Rate limiting (express-rate-limit or similar)
- User authentication (multi-user support)
- PostgreSQL option for production
- Webhooks for meal logged events
- Batch meal logging
- Food search endpoint (search Fitbit food database)
- Meal templates/favorites
- Analytics endpoints

## License

MIT

## Support

For issues or questions:
1. Check SETUP.md for setup problems
2. Check FITBIT_REFERENCE.md for API constants
3. Check Swagger docs at /documentation
4. Review Fitbit developer docs: https://dev.fitbit.com/

# Fitbit Meal Logger Backend

A strict, "dumb" backend for logging meals to Fitbit via Custom GPT Actions. The backend performs NO inference—ChatGPT handles all portion sizes, calories, macros, unit IDs, meal types, and food itemization.

> **⚠️ Important**: This project requires **Node.js 20.x LTS**. Node.js 22+ and 24+ are NOT compatible with the native SQLite module. Use `nvm use 20` or install Node 20 from [nodejs.org](https://nodejs.org/).

> **📖 New here?** Check **[INDEX.md](INDEX.md)** for a complete guide to all project files, or **[QUICKSTART.md](QUICKSTART.md)** to get running in 5 minutes.

## Features

- ✅ Strict validation with Zod (no guessing, no defaults)
- ✅ OAuth 2.0 Authorization Code flow for Fitbit
- ✅ SQLite storage for tokens and food registry
- ✅ Idempotency support for meal logging
- ✅ OpenAPI/Swagger documentation
- ✅ API key authentication
- ✅ Automatic token refresh

## Tech Stack

- Node.js 20+
- TypeScript
- Fastify
- better-sqlite3
- Zod
- undici (fetch)

## Prerequisites

**Node.js Version**: This project requires Node.js 20.x LTS (not Node 22+ or 24+) due to native module compatibility.

If you're using nvm:
```bash
nvm install 20
nvm use 20
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root with the following content:

```env
PORT=3000
BASE_URL=http://localhost:3000
FITBIT_CLIENT_ID=your_fitbit_client_id
FITBIT_CLIENT_SECRET=your_fitbit_client_secret
API_KEY=your_secure_api_key_here
```

You can copy this template:

```bash
cat > .env << 'EOF'
PORT=3000
BASE_URL=http://localhost:3000
FITBIT_CLIENT_ID=your_fitbit_client_id
FITBIT_CLIENT_SECRET=your_fitbit_client_secret
API_KEY=your_secure_api_key_here
EOF
```

**Important**: Replace the placeholder values with your actual credentials:
- Get `FITBIT_CLIENT_ID` and `FITBIT_CLIENT_SECRET` from https://dev.fitbit.com/apps
- Generate a strong random string for `API_KEY` (e.g., `openssl rand -hex 32`)

### 3. Fitbit App Setup

1. Go to https://dev.fitbit.com/apps
2. Create a new app or use an existing one
3. Set the **OAuth 2.0 Application Type** to "Server"
4. Set the **Redirect URL** to: `http://localhost:3000/auth/callback` (or your BASE_URL + `/auth/callback`)
5. Required scopes: `nutrition`, `profile`
6. Copy your **Client ID** and **Client Secret** to `.env`

### 4. Run the Server

Development mode (with hot reload):

```bash
npm run dev
```

Production mode:

```bash
npm run build
npm start
```

### 5. Complete OAuth Flow

1. Open your browser and visit: `http://localhost:3000/auth/start`
2. Log in to Fitbit and authorize the app
3. You'll be redirected back with a success message
4. Tokens are now stored in `app.db`

## API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:3000/documentation
- **OpenAPI JSON**: http://localhost:3000/openapi.json

## Endpoints

### Public Endpoints (No API Key Required)

- `GET /health` - Health check
- `GET /auth/start` - Start OAuth flow (redirects to Fitbit)
- `GET /auth/callback` - OAuth callback (exchanges code for tokens)

### Protected Endpoints (Require X-API-Key Header)

- `GET /foods` - List all registered foods
- `POST /foods` - Create custom food in Fitbit + register
- `POST /foods/register` - Register existing Fitbit food by ID
- `POST /meals/log` - Log a meal to Fitbit
- `GET /units` - Get Fitbit units list (optional, for reference)

## Usage Examples

### 1. List Registered Foods

```bash
curl -X GET http://localhost:3000/foods \
  -H "X-API-Key: your_secure_api_key_here"
```

### 2. Create a Custom Food

Creates a new food in Fitbit and stores the mapping locally.

```bash
curl -X POST http://localhost:3000/foods \
  -H "X-API-Key: your_secure_api_key_here" \
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

**Response:**
```json
{
  "canonicalName": "protein shake",
  "fitbitFoodId": 123456789,
  "defaultUnitId": 147,
  "defaultAmount": 1
}
```

**Overwrite existing:**
```bash
curl -X POST "http://localhost:3000/foods?overwrite=true" \
  -H "X-API-Key: your_secure_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

### 3. Register an Existing Fitbit Food

Registers a food that already exists in Fitbit (no API call to Fitbit).

```bash
curl -X POST http://localhost:3000/foods/register \
  -H "X-API-Key: your_secure_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "canonicalName": "banana",
    "displayName": "Banana",
    "fitbitFoodId": 123,
    "defaultUnitId": 999,
    "defaultAmount": 1,
    "calories": 105,
    "protein_g": 1.3,
    "carbs_g": 27,
    "fat_g": 0.4
  }'
```

### 4. Log a Meal

Logs food items to Fitbit. ChatGPT must provide ALL required fields.

```bash
curl -X POST http://localhost:3000/meals/log \
  -H "X-API-Key: your_secure_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-08",
    "mealTypeId": 7,
    "items": [
      {
        "canonicalName": "protein shake",
        "amount": 1,
        "unitId": 147
      },
      {
        "foodId": 123,
        "amount": 2,
        "unitId": 999,
        "note": "Medium size"
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "logged": [
    {
      "foodId": 123456789,
      "amount": 1,
      "unitId": 147,
      "fitbitLogId": 987654321
    },
    {
      "foodId": 123,
      "amount": 2,
      "unitId": 999,
      "fitbitLogId": 987654322
    }
  ]
}
```

**With idempotency:**
```bash
curl -X POST http://localhost:3000/meals/log \
  -H "X-API-Key: your_secure_api_key_here" \
  -H "Idempotency-Key: unique-request-id-123" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

### 5. Get Fitbit Units (Optional)

```bash
curl -X GET http://localhost:3000/units \
  -H "X-API-Key: your_secure_api_key_here"
```

## Fitbit Meal Type IDs

Common meal type IDs used by Fitbit:

- `1` - Breakfast
- `2` - Morning Snack
- `3` - Lunch
- `4` - Afternoon Snack
- `5` - Dinner
- `7` - Anytime

## Error Responses

### 400 - Validation Error

```json
{
  "error": "VALIDATION_ERROR",
  "details": [...]
}
```

### 401 - Unauthorized

```json
{
  "error": "UNAUTHORIZED"
}
```

### 409 - Conflict

```json
{
  "error": "CONFLICT",
  "message": "Food with canonical name \"protein shake\" already exists. Use ?overwrite=true to replace."
}
```

### 502 - Fitbit Upstream Error

```json
{
  "error": "FITBIT_UPSTREAM_ERROR",
  "status": 400,
  "body": "..."
}
```

## Database Schema

The SQLite database (`app.db`) contains:

- **tokens** - Fitbit OAuth tokens (access_token, refresh_token, expires_at)
- **foods** - Registered food mappings (canonical_name → fitbit_food_id)
- **idempotency_keys** - Idempotency tracking for meal logs
- **logs** - Optional audit trail of all meal logs

## Architecture Principles

### Strict Validation

- NO inference, NO guessing, NO defaults (except trivial canonicalName normalization)
- If required fields are missing → 400 error with clear message
- If a canonical food doesn't exist → 400 error listing missing foods

### ChatGPT Does ALL the Work

The Custom GPT Action must provide:
- Exact portion sizes (amount)
- Exact unit IDs (unitId)
- Exact meal type IDs (mealTypeId)
- Exact dates (YYYY-MM-DD)
- Calories and macros for custom foods

The backend is "dumb"—it only validates and forwards to Fitbit.

### Security

- API key required for all endpoints except `/health` and `/auth/*`
- Fitbit tokens stored ONLY in SQLite, never exposed in responses
- Environment variables for secrets

## Custom GPT Actions Setup

1. Copy the OpenAPI spec from http://localhost:3000/openapi.json
2. In ChatGPT Custom GPT settings → Actions → Import from URL or paste JSON
3. Add authentication:
   - Type: API Key
   - Header name: `X-API-Key`
   - Value: Your API key from `.env`
4. Test the actions in the GPT playground

## Development

File structure:

```
├── src/
│   ├── server.ts          # Main Fastify app
│   ├── config.ts          # Environment config
│   ├── db.ts              # SQLite database layer
│   ├── fitbitClient.ts    # Fitbit API client
│   └── routes/
│       ├── auth.ts        # OAuth routes
│       ├── foods.ts       # Food management
│       ├── meals.ts       # Meal logging
│       └── units.ts       # Units proxy
├── package.json
├── tsconfig.json
├── .env                   # Your config (git-ignored)
└── app.db                 # SQLite database (git-ignored)
```

## Docker Deployment

### Build and Run with Docker

```bash
docker build -t fitbit-meal-logger .
docker run -p 3000:3000 --env-file .env fitbit-meal-logger
```

### Using Docker Compose

```bash
docker-compose up -d
```

Make sure your `.env` file includes the correct `BASE_URL` for your deployment.

## Production Deployment

### Prerequisites
1. Server with Node.js 20 installed
2. Domain name with SSL certificate (recommended)
3. Fitbit app configured with production callback URL

### Steps

1. **Update Environment**:
```env
PORT=3000
BASE_URL=https://yourdomain.com
FITBIT_CLIENT_ID=your_client_id
FITBIT_CLIENT_SECRET=your_client_secret
API_KEY=your_secure_key
```

2. **Update Fitbit App**:
   - Go to https://dev.fitbit.com/apps
   - Update Callback URL to: `https://yourdomain.com/auth/callback`

3. **Deploy**:
```bash
npm ci --production
npm run build
npm start
```

4. **Use Process Manager** (recommended):
```bash
npm install -g pm2
pm2 start dist/server.js --name fitbit-logger
pm2 save
pm2 startup
```

5. **Set Up Reverse Proxy** (Nginx example):
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Project Files

- **README.md** - Main documentation (this file)
- **SETUP.md** - Step-by-step setup guide
- **PROJECT_SUMMARY.md** - Architecture and technical overview
- **FITBIT_REFERENCE.md** - Fitbit API constants and reference
- **examples.http** - REST Client examples for testing
- **test-api.sh** - Automated API test script

## Contributing

This is a complete, production-ready implementation. For customizations:
1. Fork the repository
2. Make your changes
3. Test thoroughly with real Fitbit API
4. Update documentation as needed

## License

MIT

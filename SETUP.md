# Quick Setup Guide

Follow these steps to get the Fitbit Meal Logger backend running.

## Step 1: Node.js Version

**CRITICAL**: You must use Node.js 20.x LTS.

### Check your current Node version:
```bash
node --version
```

### If you're using nvm:
```bash
nvm install 20
nvm use 20
```

### If you don't have nvm:
Download Node.js 20.x LTS from https://nodejs.org/

## Step 2: Install Dependencies

```bash
cd fitbit-meal-logger
npm install
```

If you see errors about `better-sqlite3` compilation, you're likely using the wrong Node version. Go back to Step 1.

## Step 3: Create Fitbit App

1. Go to https://dev.fitbit.com/apps
2. Click "Register an app"
3. Fill in:
   - **Application Name**: Meal Logger (or your choice)
   - **Description**: Meal logging backend
   - **Application Website**: http://localhost:3000
   - **Organization**: Your name
   - **Organization Website**: http://localhost:3000
   - **OAuth 2.0 Application Type**: **Server**
   - **Callback URL**: `http://localhost:3000/auth/callback`
   - **Default Access Type**: Read & Write
4. Click "Save"
5. Copy your **OAuth 2.0 Client ID** and **Client (Consumer) Secret**

## Step 4: Create .env File

```bash
cat > .env << 'EOF'
PORT=3000
BASE_URL=http://localhost:3000
FITBIT_CLIENT_ID=YOUR_CLIENT_ID_HERE
FITBIT_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
API_KEY=YOUR_API_KEY_HERE
EOF
```

Now edit `.env` and replace:
- `YOUR_CLIENT_ID_HERE` with your Fitbit Client ID
- `YOUR_CLIENT_SECRET_HERE` with your Fitbit Client Secret  
- `YOUR_API_KEY_HERE` with a strong random string (generate with: `openssl rand -hex 32`)

## Step 5: Start the Server

```bash
npm run dev
```

You should see:
```
Server running at http://localhost:3000
Documentation available at http://localhost:3000/documentation
```

## Step 6: Authorize with Fitbit

1. Open your browser
2. Visit: http://localhost:3000/auth/start
3. Log in to Fitbit
4. Click "Allow" to authorize the app
5. You should see: `{"success":true,"message":"Tokens saved successfully"}`

## Step 7: Test the API

### Health check (no auth needed):
```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok"}`

### Get foods (requires API key):
```bash
curl -X GET http://localhost:3000/foods \
  -H "X-API-Key: YOUR_API_KEY_HERE"
```

Expected: `[]` (empty array on first run)

## Step 8: View Documentation

Open in your browser: http://localhost:3000/documentation

You'll see the full Swagger UI with all endpoints and schemas.

## Step 9: Get OpenAPI Spec for GPT

```bash
curl http://localhost:3000/openapi.json > openapi.json
```

Copy the contents of `openapi.json` and paste it into your Custom GPT Actions configuration.

## Troubleshooting

### "Missing required environment variables"
- Make sure `.env` exists and has all 5 variables set

### "better-sqlite3" compilation errors
- You're using the wrong Node version. Must be Node 20.x

### "UNAUTHORIZED" when calling API
- Add the `X-API-Key` header with your API key from `.env`

### "No tokens found"
- Complete Step 6 (OAuth flow) first

### Fitbit returns errors
- Check that your Fitbit app's callback URL is correct
- Make sure your scopes include `nutrition` and `profile`
- Verify your Client ID and Secret in `.env`

## Next Steps

Once everything is working:

1. **Register some foods** using `POST /foods` or `POST /foods/register`
2. **Test meal logging** with `POST /meals/log`
3. **Configure your Custom GPT** with the OpenAPI spec
4. **Deploy to production** (update `BASE_URL` and Fitbit callback URL)

See the main README.md for detailed API documentation and cURL examples.

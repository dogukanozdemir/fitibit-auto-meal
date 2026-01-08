# 5-Minute Quickstart

Get the Fitbit Meal Logger running in 5 minutes.

## Prerequisites
- Node.js 20.x LTS ([download here](https://nodejs.org/))
- A Fitbit account
- A terminal/command line

## Step 1: Setup (2 minutes)

```bash
cd fitbit-meal-logger

nvm use 20

npm install

cat > .env << 'EOF'
PORT=3000
BASE_URL=http://localhost:3000
FITBIT_CLIENT_ID=PASTE_HERE
FITBIT_CLIENT_SECRET=PASTE_HERE
API_KEY=$(openssl rand -hex 32)
EOF
```

## Step 2: Get Fitbit Credentials (2 minutes)

1. Go to https://dev.fitbit.com/apps
2. Click "Register an app"
3. Fill in:
   - **OAuth 2.0 Application Type**: Server
   - **Callback URL**: `http://localhost:3000/auth/callback`
4. Copy your Client ID and Client Secret
5. Paste them into `.env` file

## Step 3: Run (1 minute)

```bash
npm run dev
```

Open browser → http://localhost:3000/auth/start → Login to Fitbit

## Test It

```bash
export API_KEY=$(grep API_KEY .env | cut -d '=' -f2)

curl http://localhost:3000/foods \
  -H "X-API-Key: $API_KEY"
```

You should see: `[]`

## What's Next?

- **Read README.md** for full API documentation
- **Read SETUP.md** for detailed setup instructions
- **Read CUSTOM_GPT_INSTRUCTIONS.md** to configure ChatGPT
- **Use examples.http** for API testing
- **Visit** http://localhost:3000/documentation for Swagger UI

## Quick Test

Create a food and log it:

```bash
API_KEY=$(grep API_KEY .env | cut -d '=' -f2)

curl -X POST http://localhost:3000/foods \
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

curl -X POST http://localhost:3000/meals/log \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"date\": \"$(date +%Y-%m-%d)\",
    \"mealTypeId\": 7,
    \"items\": [{
      \"canonicalName\": \"test food\",
      \"amount\": 1,
      \"unitId\": 147
    }]
  }"
```

Check your Fitbit app - you should see the meal logged!

## Troubleshooting

### "Missing required environment variables"
Edit `.env` and make sure all 5 variables are set.

### "better-sqlite3" won't compile
You're not using Node.js 20. Run `nvm use 20` or install Node 20.

### "UNAUTHORIZED"
Your API key is wrong. Check `.env` file.

### "No tokens found"
You didn't complete OAuth. Visit http://localhost:3000/auth/start

---

**That's it!** You now have a working Fitbit meal logging API.

For production deployment, see README.md.
